import { Component, ChangeDetectionStrategy, signal, inject, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Search, X, Plus, Minus, Trash2, CreditCard } from 'lucide-angular';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Product } from '../../../core/models/product.model';
import { InventoryService } from '../../../core/api/inventory.service';
import { NotificationService } from '../../../core/services/notification';
import { CurrencyPipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-pos-page',
  imports: [ReactiveFormsModule, LucideAngularModule, CurrencyPipe, DecimalPipe],
  templateUrl: './pos.page.html',
  styleUrls: ['./pos.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosPage implements OnInit {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private notificationService = inject(NotificationService);

  protected readonly SearchIcon = Search;
  protected readonly XIcon = X;
  protected readonly PlusIcon = Plus;
  protected readonly MinusIcon = Minus;
  protected readonly TrashIcon = Trash2;
  protected readonly CreditCardIcon = CreditCard;

  allProducts = signal<Product[]>([]);
  isLoading = signal(true);
  searchTerm = signal('');

  filteredProducts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.allProducts().filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.sku && p.sku.toLowerCase().includes(term))
    );
  });

  saleForm!: FormGroup;

  subtotal = signal(0);
  taxAmount = computed(() => this.subtotal() * 0.18);
  total = computed(() => this.subtotal() + this.taxAmount());

  ngOnInit(): void {
    this.saleForm = this.fb.group({
      cartItems: this.fb.array([]),
      customer: ['Cliente General'],
    });

    this.loadProducts();

    this.saleForm.get('cartItems')?.valueChanges.subscribe(() => {
        this.calculateTotals();
    });
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.inventoryService.getProducts().subscribe({
      next: (products) => {
        this.allProducts.set(products);
        this.isLoading.set(false);
      },
      error: () => {
        this.notificationService.showError('No se pudieron cargar los productos.');
        this.isLoading.set(false);
      }
    });
  }

  get cartItems(): FormArray {
    return this.saleForm.get('cartItems') as FormArray;
  }

  addToCart(product: Product): void {
    const existingItemIndex = this.cartItems.controls.findIndex(
      (control) => control.get('productId')?.value === product.id
    );

    if (existingItemIndex > -1) {
      const item = this.cartItems.at(existingItemIndex);
      item.get('quantity')?.setValue(item.get('quantity')?.value + 1);
    } else {
      const newItem = this.fb.group({
        productId: [product.id],
        name: [product.name],
        price: [product.price],
        quantity: [1],
      });
      this.cartItems.push(newItem);
    }
  }

  updateQuantity(index: number, change: number): void {
    const item = this.cartItems.at(index);
    const newQuantity = (item.get('quantity')?.value || 0) + change;
    if (newQuantity > 0) {
      item.get('quantity')?.setValue(newQuantity);
    } else {
      this.cartItems.removeAt(index);
    }
  }

  removeItem(index: number): void {
    this.cartItems.removeAt(index);
  }

  calculateTotals(): void {
    const sub = this.cartItems.controls.reduce((acc, control) => {
      const quantity = control.get('quantity')?.value || 0;
      const price = control.get('price')?.value || 0;
      return acc + (quantity * price);
    }, 0);
    this.subtotal.set(sub);
  }

  getItemTotal(index: number): number {
    const item = this.cartItems.at(index);
    return (item.get('quantity')?.value || 0) * (item.get('price')?.value || 0);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  completeSale(): void {
    if (this.saleForm.valid && this.cartItems.length > 0) {
      // Aquí se llamaría al servicio de ventas
      this.notificationService.showSuccess('Venta completada con éxito.');
      this.cartItems.clear();
      this.searchTerm.set('');
    } else {
      this.notificationService.showError('El carrito está vacío.');
    }
  }
}
