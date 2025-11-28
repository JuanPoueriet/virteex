import { Component, ChangeDetectionStrategy, inject, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, Save, Building2, User, Mail, Phone, Hash, MapPin } from 'lucide-angular';

@Component({
  selector: 'app-customer-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './customer-form.page.html',
  styleUrls: ['./customer-form.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerFormPage implements OnInit {
  @Input() id?: string; // Recibe el ID desde la ruta para modo edición

  private fb = inject(FormBuilder);
  private router = inject(Router);

  protected readonly SaveIcon = Save;

  customerForm!: FormGroup;
  isEditMode = signal(false);

  ngOnInit(): void {
    this.customerForm = this.fb.group({
      companyName: ['', Validators.required],
      taxId: ['', Validators.required],
      contactPerson: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: [''],
      city: [''],
      stateOrProvince: [''],
      postalCode: [''],
      country: ['DO', Validators.required],
    });

    if (this.id) {
      this.isEditMode.set(true);
      // Lógica para cargar los datos del cliente por ID
      console.log('Edit mode for customer with ID:', this.id);
    }
  }

  saveCustomer(): void {
    if (this.customerForm.valid) {
      console.log('Saving customer data:', this.customerForm.value);
      this.router.navigate(['/app/masters/customers']);
    }
  }
}