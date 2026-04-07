import { Component, ChangeDetectionStrategy, inject, OnInit, signal, input, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Save } from 'lucide-angular';
import { TaxesService, CreateTaxDto, UpdateTaxDto } from '../../../../core/api/taxes.service';
import { NotificationService } from '../../../../core/services/notification';
import { TaxType } from '../../../../core/models/tax.model';

@Component({
  selector: 'app-tax-form-page',
  imports: [RouterLink, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './tax-form.page.html',
  styleUrls: ['./tax-form.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxFormPage implements OnInit {
  id = input<string>();

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private taxesService = inject(TaxesService);
  private notificationService = inject(NotificationService);

  protected readonly SaveIcon = Save;
  taxForm!: FormGroup;
  isEditMode = signal(false);
  isLoading = signal(true);
  taxTypes = Object.values(TaxType);

  constructor() {
    effect(() => {
      const idValue = this.id();
      if (idValue) {
        this.isEditMode.set(true);
        this.loadTaxData(idValue);
      } else {
        this.isEditMode.set(false);
        this.isLoading.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.taxForm = this.fb.group({
      name: ['', Validators.required],
      rate: [0, [Validators.required, Validators.min(0)]],
      type: [TaxType.PERCENTAGE, Validators.required],
      countryCode: ['DO'],
    });
  }

  loadTaxData(id: string): void {
    this.isLoading.set(true);
    this.taxesService.getTaxById(id).subscribe({
      next: (tax) => {
        this.taxForm.patchValue(tax);
        this.isLoading.set(false);
      },
      error: () => {
        this.notificationService.showError('No se pudo cargar el impuesto.');
        this.router.navigate(['/app/masters/taxes']);
      },
    });
  }

  saveTax(): void {
    if (this.taxForm.invalid) {
      this.taxForm.markAllAsTouched();
      this.notificationService.showError('Por favor, completa los campos requeridos.');
      return;
    }

    this.isLoading.set(true);
    const formValue = this.taxForm.getRawValue();

    const taxId = this.id();
    const operation = taxId
      ? this.taxesService.updateTax(taxId, formValue as UpdateTaxDto)
      : this.taxesService.createTax(formValue as CreateTaxDto);

    operation.subscribe({
      next: () => {
        this.notificationService.showSuccess(`Impuesto ${this.isEditMode() ? 'actualizado' : 'creado'} exitosamente.`);
        this.router.navigate(['/app/masters/taxes']);
      },
      error: () => {
        this.notificationService.showError(`Error al ${this.isEditMode() ? 'actualizar' : 'crear'} el impuesto.`);
        this.isLoading.set(false);
      },
    });
  }
}
