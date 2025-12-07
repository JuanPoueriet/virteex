
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
  template: `
    <div class="w-full mb-4">
      <label *ngIf="label" class="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
        {{ label | translate }}
      </label>

      <div class="relative group">
        <!-- Icon -->
        <div *ngIf="icon" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors duration-200">
          <lucide-icon [img]="icon" class="w-5 h-5"></lucide-icon>
        </div>

        <!-- Input -->
        <input
          [type]="inputType"
          [placeholder]="placeholder | translate"
          [formControl]="control"
          (blur)="onTouched()"
          [class.pl-10]="icon"
          [class.pr-10]="type === 'password'"
          [class.border-red-300]="hasError"
          [class.focus:border-red-500]="hasError"
          [class.focus:ring-red-200]="hasError"
          class="block w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-gray-900 placeholder-gray-400 focus:border-primary focus:ring focus:ring-primary/20 transition-all duration-200 py-2.5 text-sm sm:text-base shadow-sm hover:border-gray-300"
        />

        <!-- Password Toggle -->
        <button
          *ngIf="type === 'password'"
          type="button"
          (click)="togglePasswordVisibility()"
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer transition-colors"
        >
          <lucide-icon [img]="passwordVisible ? EyeOffIcon : EyeIcon" class="w-5 h-5"></lucide-icon>
        </button>
      </div>

      <!-- Error Message -->
      <div *ngIf="hasError" class="mt-1.5 flex items-start text-xs text-red-600 ml-1 animate-fadeIn">
        <lucide-icon [img]="AlertCircleIcon" class="w-3.5 h-3.5 mr-1 mt-0.5 flex-shrink-0"></lucide-icon>
        <span>{{ errorMessage | translate }}</span>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out forwards;
    }
  `]
})
export class AuthInputComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' = 'text';
  @Input() icon: LucideIconData | null = null;
  @Input() control: FormControl = new FormControl();
  @Input() errorKey: string = ''; // Base key for errors like 'LOGIN.ERRORS'

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
    // Add more standard errors or passed custom errors
    return `${this.errorKey}.INVALID`;
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  // ControlValueAccessor methods (dummy as we use [formControl] directly usually, but good for custom form compatibility)
  writeValue(value: any): void {}
  registerOnChange(fn: any): void {}
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  onTouched: () => void = () => {};
}
