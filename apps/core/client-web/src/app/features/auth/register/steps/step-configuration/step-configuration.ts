import { Component, Input, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, MapPin, Landmark, Phone, Hash, Code, Scale, Clock, Calendar, Percent } from 'lucide-angular';
import { CountryService } from '../../../../../core/services/country.service';

@Component({
  selector: 'app-step-configuration', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './step-configuration.html', styleUrls: ['./step-configuration.scss']
})
export class StepConfiguration {
  @Input() parentForm!: FormGroup;
  public countryService = inject(CountryService);

  protected readonly AddressIcon = MapPin;
  protected readonly CountryIcon = Landmark;
  protected readonly PhoneIcon = Phone;
  protected readonly TaxIdIcon = Hash;
  protected readonly CodeIcon = Code;
  protected readonly CurrencyIcon = Scale;
  protected readonly TimezoneIcon = Clock;
  protected readonly CalendarIcon = Calendar;
  protected readonly PercentIcon = Percent;
}