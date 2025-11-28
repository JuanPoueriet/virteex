// app/features/masters/price-lists/price-lists-form/price-list-form.page.ts
import { Component, ChangeDetectionStrategy, inject, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Save, Plus, Trash2 } from 'lucide-angular';
import { PriceListsService, CreatePriceListDto, UpdatePriceListDto } from '../../../../core/api/price-lists.service';
import { InventoryService } from '../../../../core/api/inventory.service';
import { NotificationService } from '../../../../core/services/notification';
import { Product } from '../../../../core/models/product.model';
import { PriceListItem, PriceListStatus } from '../../../../core/models/price-list.model'; // <-- Corregido el import

@Component({
  selector: 'app-price-list-form-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './price-list-form.page.html',
  styleUrls: ['./price-list-form.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceListFormPage implements OnInit {
  @Input() id?: string;

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private priceListsService = inject(PriceListsService);
  private inventoryService = inject(InventoryService);
  private notificationService = inject(NotificationService);

  protected readonly SaveIcon = Save;
  protected readonly PlusIcon = Plus;
  protected readonly TrashIcon = Trash2;

  priceListForm!: FormGroup;
  isEditMode = signal(false);
  isLoading = signal(true);
  isSaving = signal(false); // <-- Añadido para controlar el estado de guardado
  products = signal<Product[]>([]);

  statusOptions: PriceListStatus[] = [PriceListStatus.DRAFT, PriceListStatus.ACTIVE, PriceListStatus.INACTIVE];

  ngOnInit(): void {
    const today = new Date().toISOString().split('T')[0];
    this.priceListForm = this.fb.group({
      name: ['', Validators.required],
      currency: ['USD', Validators.required],
      validFrom: [today, Validators.required],
      validTo: [today, Validators.required],
      status: [PriceListStatus.DRAFT, Validators.required],
      items: this.fb.array([], [Validators.required, Validators.minLength(1)]),
    });

    this.loadProducts();

    if (this.id) {
      this.isEditMode.set(true);
      this.loadPriceListData(this.id);
    } else {
      this.isLoading.set(false);
      this.addLine();
    }
  }

  loadProducts(): void {
    this.inventoryService.getProducts().subscribe({
      next: (products) => this.products.set(products),
      error: () => this.notificationService.showError('Could not load products.'),
    });
  }

  loadPriceListData(id: string): void {
    this.priceListsService.getPriceListById(id).subscribe({
      next: (priceList) => {
        this.priceListForm.patchValue({
          ...priceList,
          validFrom: new Date(priceList.validFrom).toISOString().split('T')[0],
          validTo: new Date(priceList.validTo).toISOString().split('T')[0],
        });
        
        // Limpiamos las líneas existentes antes de añadir las nuevas
        this.lines.clear();
        priceList.items.forEach((item: PriceListItem) => { // <-- Tipo explícito añadido
            this.lines.push(this.createLine(item.productId, item.price));
        });

        this.isLoading.set(false);
      },
      error: () => {
        this.notificationService.showError('Could not load price list data.');
        this.router.navigate(['/app/masters/price-lists']);
      },
    });
  }

  get lines(): FormArray {
    return this.priceListForm.get('items') as FormArray;
  }

  createLine(productId: string = '', price: number = 0): FormGroup {
    return this.fb.group({
      productId: [productId, Validators.required],
      price: [price, [Validators.required, Validators.min(0.01)]],
    });
  }

  addLine(): void {
    this.lines.push(this.createLine());
  }

  removeLine(index: number): void {
    if (this.lines.length > 1) {
        this.lines.removeAt(index);
    }
  }

  savePriceList(): void {
    if (this.priceListForm.invalid) {
      this.priceListForm.markAllAsTouched();
      this.notificationService.showError('Please complete all required fields.');
      return;
    }

    if (this.isSaving()) return;
    this.isSaving.set(true);
    
    const formValue = this.priceListForm.getRawValue();

    const operation = this.isEditMode()
      ? this.priceListsService.updatePriceList(this.id!, formValue as UpdatePriceListDto)
      : this.priceListsService.createPriceList(formValue as CreatePriceListDto);

    operation.subscribe({
      next: () => {
        this.notificationService.showSuccess(`Price list ${this.isEditMode() ? 'updated' : 'created'} successfully.`);
        this.router.navigate(['/app/masters/price-lists']);
      },
      error: (err) => {
        console.error(err);
        this.notificationService.showError(`Error ${this.isEditMode() ? 'updating' : 'creating'} price list.`);
        this.isSaving.set(false);
      },
      complete: () => {
        this.isSaving.set(false);
      }
    });
  }
}