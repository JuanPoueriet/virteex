import { Component, Input, signal, inject, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Building2, Briefcase, Users, Globe, Landmark, Image, MapPin } from 'lucide-angular';
import { Observable } from 'rxjs';
import { FiscalRegion } from '../../../../../core/models/fiscal-region.model';
import { LocalizationApiService } from '../../../../../core/api/localization.service';
// import { FiscalRegion } from '../app/core/models/fiscal-region.model';
// import { LocalizationApiService } from '../app/core/api/localization.service';

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

  logoPreview = signal<string | ArrayBuffer | null>(null);
  fiscalRegions$!: Observable<FiscalRegion[]>;

  private localizationApiService = inject(LocalizationApiService);

  ngOnInit(): void {
    this.fiscalRegions$ = this.localizationApiService.getFiscalRegions();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.parentForm.patchValue({ logoFile: file });
      const reader = new FileReader();
      reader.onload = () => this.logoPreview.set(reader.result);
      reader.readAsDataURL(file);
    }
  }
}