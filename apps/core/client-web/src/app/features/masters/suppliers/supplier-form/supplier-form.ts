import { Component, ChangeDetectionStrategy, inject, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Save } from 'lucide-angular';
import { SuppliersService, CreateSupplierDto, UpdateSupplierDto } from '../../../../core/api/suppliers.service';
import { NotificationService } from '../../../../core/services/notification';

@Component({
  selector: 'app-supplier-form-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './supplier-form.html',
  styleUrls: ['./supplier-form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierForm implements OnInit {
  @Input() id?: string;

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private suppliersService = inject(SuppliersService);
  private notificationService = inject(NotificationService);

  protected readonly SaveIcon = Save;

  supplierForm!: FormGroup;
  isEditMode = signal(false);
  isLoading = signal(true);

  ngOnInit(): void {
    this.supplierForm = this.fb.group({
      name: ['', Validators.required],
      contactPerson: [''],
      email: ['', [Validators.email]],
      phone: [''],
      taxId: [''],
      address: [''],
    });

    if (this.id) {
      this.isEditMode.set(true);
      this.loadSupplierData(this.id);
    } else {
      this.isLoading.set(false);
    }
  }

  loadSupplierData(id: string): void {
    this.suppliersService.getSupplierById(id).subscribe({
      next: (supplier) => {
        this.supplierForm.patchValue(supplier);
        this.isLoading.set(false);
      },
      error: () => {
        this.notificationService.showError('No se pudo cargar el proveedor.');
        this.router.navigate(['/app/contacts/suppliers']);
      },
    });
  }

  saveSupplier(): void {
    if (this.supplierForm.invalid) {
      this.supplierForm.markAllAsTouched();
      this.notificationService.showError('Por favor, completa los campos requeridos.');
      return;
    }

    this.isLoading.set(true);
    const formValue = this.supplierForm.getRawValue();

    const operation = this.isEditMode()
      ? this.suppliersService.updateSupplier(this.id!, formValue as UpdateSupplierDto)
      : this.suppliersService.createSupplier(formValue as CreateSupplierDto);

    operation.subscribe({
      next: () => {
        this.notificationService.showSuccess(`Proveedor ${this.isEditMode() ? 'actualizado' : 'creado'} exitosamente.`);
        this.router.navigate(['/app/contacts/suppliers']);
      },
      error: () => {
        this.notificationService.showError(`Error al ${this.isEditMode() ? 'actualizar' : 'crear'} el proveedor.`);
        this.isLoading.set(false);
      },
    });
  }
}