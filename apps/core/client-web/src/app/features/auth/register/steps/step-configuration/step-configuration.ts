import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CountryService } from '../../../../../core/services/country.service';
import { AuthInputComponent } from '../../../components/auth-input/auth-input.component';

@Component({
  selector: 'app-step-configuration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, AuthInputComponent],
  templateUrl: './step-configuration.html',
})
export class StepConfiguration {
  @Input() group!: FormGroup;
  public countryService = inject(CountryService);
  private translate = inject(TranslateService);

  onFlagError(event: any) {
    event.target.src = 'assets/flags/do.svg'; // Fallback
  }

  getTaxIdError(): string {
    const control = this.group.get('taxId');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'REGISTER.ERRORS.REQUIRED';
      if (control.errors['pattern']) return this.countryService.currentCountry()?.formSchema?.taxId?.errorMessage || 'REGISTER.ERRORS.INVALID_FORMAT';
    }
    return '';
  }
}
