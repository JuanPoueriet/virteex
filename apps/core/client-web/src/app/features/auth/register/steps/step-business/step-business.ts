import { Component, Input, signal, inject, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Building2, Briefcase, Users, Globe, Landmark, Image, MapPin } from 'lucide-angular';
import { Observable } from 'rxjs';
import { FiscalRegion } from '../../../../../core/models/fiscal-region.model';
import { LocalizationApiService } from '../../../../../core/api/localization.service';

@Component({
  selector: 'app-step-business', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './step-business.html', styleUrls: ['./step-business.scss']
})
export class StepBusiness implements OnInit {
  @Input() parentForm!: FormGroup;
  protected readonly CompanyIcon = Building2;
  protected readonly IndustryIcon = Briefcase;
  protected readonly LegalFormIcon = Landmark;
  protected readonly EmployeesIcon = Users;
  protected readonly WebsiteIcon = Globe;
  protected readonly LogoIcon = Image;
  protected readonly FiscalRegionIcon = MapPin;

  // Data for Selects
  industries = [
    { id: 'tech', label: 'Tecnología y Software' },
    { id: 'retail', label: 'Comercio Minorista (Retail)' },
    { id: 'services', label: 'Servicios Profesionales' },
    { id: 'construction', label: 'Construcción e Inmobiliaria' },
    { id: 'health', label: 'Salud y Medicina' },
    { id: 'manufacturing', label: 'Manufactura' },
    { id: 'education', label: 'Educación' },
    { id: 'other', label: 'Otro' }
  ];

  companySizes = [
    { id: '1-10', label: '1 - 10 empleados' },
    { id: '11-50', label: '11 - 50 empleados' },
    { id: '51-200', label: '51 - 200 empleados' },
    { id: '201+', label: 'Más de 200 empleados' }
  ];

  private localizationApiService = inject(LocalizationApiService);

  ngOnInit(): void {
    // No explicit initialization needed for static lists
  }
}
