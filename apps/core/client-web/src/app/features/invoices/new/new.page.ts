import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InvoicesService, CreateInvoiceDto } from '../../../core/services/invoices';
import { CustomersService } from '../../../core/api/customers.service';
import { InventoryService } from '../../../core/api/inventory.service';
import { Customer } from '../../../core/models/customer.model';
import { Product } from '../../../core/models/product.model';
import { NotificationService } from '../../../core/services/notification';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-new-invoice-page',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './new.page.html',
  styleUrls: ['./new.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewInvoicePage implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private invoicesService = inject(InvoicesService);
  private customersService = inject(CustomersService);
  private inventoryService = inject(InventoryService);
  private notificationService = inject(NotificationService);

  invoiceForm: FormGroup;
  customers = signal<Customer[]>([]);
  products = signal<Product[]>([]);
  isSaving = signal(false);

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
    this.customersService.getCustomers().subscribe((data) => this.customers.set(data));
    this.inventoryService.getProducts().subscribe((data) => this.products.set(data));
  }

  get lineItems(): FormArray {
    return this.invoiceForm.get('lineItems') as FormArray;
  }

  createLineItem(): FormGroup {
    return this.fb.group({
      productId: ['', Validators.required],
      description: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(0)]],
      taxRate: [0.18, [Validators.required, Validators.min(0), Validators.max(1)]],
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
    const selectedProduct = this.products().find((p) => p.id === productId);
    if (selectedProduct) {
      this.lineItems.at(index).patchValue({
        description: selectedProduct.name,
        price: selectedProduct.price,
      });
    }
  }

  get totals() {
    let subtotal = 0;
    let tax = 0;

    this.lineItems.controls.forEach((control) => {
      const qty = control.get('quantity')?.value || 0;
      const price = control.get('price')?.value || 0;
      const taxRate = control.get('taxRate')?.value || 0;

      const lineTotal = qty * price;
      subtotal += lineTotal;
      tax += lineTotal * taxRate;
    });

    return {
      subtotal,
      tax,
      total: subtotal + tax
    };
  }

  validateStock(index: number): boolean {
    const control = this.lineItems.at(index);
    const productId = control.get('productId')?.value;
    const qty = control.get('quantity')?.value;

    if (!productId || !qty) return true;

    const product = this.products().find(p => p.id === productId);
    if (product && qty > product.stock) {
      return false;
    }
    return true;
  }

  onSubmit(): void {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      this.notificationService.showError('Por favor, completa todos los campos requeridos.');
      return;
    }

    this.isSaving.set(true);
    const formValue = this.invoiceForm.getRawValue();
    const payload: CreateInvoiceDto = {
      customerId: formValue.customerId,
      issueDate: formValue.issueDate,
      dueDate: formValue.dueDate,
      notes: formValue.notes,
      lineItems: formValue.lineItems.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        description: item.description,
        taxRate: item.taxRate
      }))
    };

    this.invoicesService.createInvoice(payload).subscribe({
      next: () => {
        this.notificationService.showSuccess('Factura creada exitosamente.');
        this.router.navigate(['/invoices']);
      },
      error: (err) => {
        console.error('Error body:', err.error);
        const errorMessage = err.error?.message || err.message || 'Error desconocido al crear la factura.';
        this.notificationService.showError(`Error al crear la factura: ${errorMessage}`);
        this.isSaving.set(false);
      },
    });
  }
}
