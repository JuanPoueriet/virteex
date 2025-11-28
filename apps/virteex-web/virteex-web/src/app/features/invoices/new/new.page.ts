import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { InvoicesService, CreateInvoiceDto } from '../../../core/services/invoices';
import { CustomersService } from '../../../core/api/customers.service';
import { InventoryService } from '../../../core/api/inventory.service';
import { Customer } from '../../../core/models/customer.model';
import { Product } from '../../../core/models/product.model';
import { NotificationService } from '../../../core/services/notification';

@Component({
  selector: 'app-new-invoice-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './new.page.html',
  styleUrls: ['./new.page.scss'],
})
export class NewInvoicePage implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private invoicesService = inject(InvoicesService);
  private customersService = inject(CustomersService);
  private inventoryService = inject(InventoryService);
  private notificationService = inject(NotificationService);

  invoiceForm: FormGroup;
  customers: Customer[] = [];
  products: Product[] = [];

  constructor() {
    this.invoiceForm = this.fb.group({
      customerId: ['', Validators.required],
      issueDate: [new Date().toISOString().split('T')[0], Validators.required],
      dueDate: ['', Validators.required],
      notes: [''],
      lineItems: this.fb.array([this.createLineItem()]),
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.customersService.getCustomers().subscribe((data) => (this.customers = data));
    this.inventoryService.getProducts().subscribe((data) => (this.products = data));
  }

  get lineItems(): FormArray {
    return this.invoiceForm.get('lineItems') as FormArray;
  }

  createLineItem(): FormGroup {
    return this.fb.group({
      productId: ['', Validators.required],
      description: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      price: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0)]],
    });
  }

  addLineItem(): void {
    this.lineItems.push(this.createLineItem());
  }

  removeLineItem(index: number): void {
    if (this.lineItems.length > 1) {
        this.lineItems.removeAt(index);
    }
  }

  onProductSelect(index: number): void {
    const productId = this.lineItems.at(index).get('productId')?.value;
    const selectedProduct = this.products.find((p) => p.id === productId);
    if (selectedProduct) {
      this.lineItems.at(index).patchValue({
        description: selectedProduct.name,
        price: selectedProduct.price,
      });
    }
  }

  onSubmit(): void {
    if (this.invoiceForm.invalid) {
      this.notificationService.showError('Por favor, completa todos los campos requeridos.');
      return;
    }

    const formValue = this.invoiceForm.getRawValue();
    // Preparamos el DTO sin los campos calculados
    const payload: CreateInvoiceDto = {
        customerId: formValue.customerId,
        issueDate: formValue.issueDate,
        dueDate: formValue.dueDate,
        notes: formValue.notes,
        lineItems: formValue.lineItems.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price, // El precio se envía para referencia, pero el backend lo validará
            description: item.description
        }))
    };
    
    this.invoicesService.createInvoice(payload).subscribe({
      next: () => {
        this.notificationService.showSuccess('Factura creada exitosamente.');
        this.router.navigate(['/app/invoices']);
      },
      error: (err) => {
        this.notificationService.showError(`Error al crear la factura: ${err.message}`);
      },
    });
  }
}