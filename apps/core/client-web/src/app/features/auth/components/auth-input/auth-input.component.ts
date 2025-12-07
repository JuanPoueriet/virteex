
import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule, LucideIconData, Eye, EyeOff, AlertCircle } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-auth-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, TranslateModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AuthInputComponent),
      multi: true
    }
  ],
  templateUrl: './auth-input.component.html',
  styleUrls: ['./auth-input.component.scss']
})
export class AuthInputComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' = 'text';
  @Input() icon: LucideIconData | null = null;
  @Input() control: FormControl = new FormControl();
  @Input() errorKey: string = '';

  EyeIcon = Eye;
  EyeOffIcon = EyeOff;
  AlertCircleIcon = AlertCircle;

  passwordVisible = false;

  get inputType(): string {
    if (this.type === 'password') {
      return this.passwordVisible ? 'text' : 'password';
    }
    return this.type;
  }

  get hasError(): boolean {
    return this.control && this.control.invalid && (this.control.dirty || this.control.touched);
  }

  get errorMessage(): string {
    if (!this.hasError) return '';

    if (this.control.hasError('required')) return `${this.errorKey}.REQUIRED`;
    if (this.control.hasError('email')) return `${this.errorKey}.INVALID_EMAIL`;
    if (this.control.hasError('minlength')) return `${this.errorKey}.MIN_LENGTH`;
    if (this.control.hasError('pattern')) return `${this.errorKey}.PATTERN`;
    return `${this.errorKey}.INVALID`;
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  writeValue(value: any): void {}
  registerOnChange(fn: any): void {}
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  onTouched: () => void = () => {};
}
