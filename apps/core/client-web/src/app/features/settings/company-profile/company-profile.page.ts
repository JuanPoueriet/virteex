import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Save } from 'lucide-angular';
// Aquí se importaría un servicio para obtener y actualizar los datos
// import { CompanyService } from '...';

@Component({
  selector: 'app-company-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './company-profile.page.html',
  styleUrls: ['./company-profile.page.scss']
})
export class CompanyProfilePage implements OnInit {
  private fb = inject(FormBuilder);
  // private companyService = inject(CompanyService);

  protected readonly SaveIcon = Save;
  profileForm!: FormGroup;

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      companyName: ['', Validators.required],
      industry: [''],
      taxId: ['', Validators.required],
      address: [''],
      city: [''],
      country: ['', Validators.required],
      companyPhone: ['', Validators.required],
      website: [''],
    });

    // Simulación de carga de datos
    this.loadCompanyData();
  }

  loadCompanyData(): void {
    // En una app real: this.companyService.getProfile().subscribe(data => ...)
    const mockData = {
      companyName: 'FacturaPRO Inc.',
      industry: 'tech',
      taxId: '130-00000-1',
      address: 'Calle Ficticia 123',
      city: 'Santo Domingo',
      country: 'DO',
      companyPhone: '809-555-0101',
      website: 'https://facturapro.com'
    };
    this.profileForm.patchValue(mockData);
  }

  saveProfile(): void {
    if (this.profileForm.valid) {
      console.log('Guardando perfil:', this.profileForm.value);
      // this.companyService.updateProfile(this.profileForm.value).subscribe(...);
    }
  }
}