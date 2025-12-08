import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, FormControl } from '@angular/forms';

@Component({
  selector: 'app-auth-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AuthInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="auth-input-group" [class.error-state]="hasError">
      <label *ngIf="label" [for]="id" class="input-label">
        {{ label }} <span *ngIf="required" class="required-mark">*</span>
      </label>

      <div class="input-wrapper">
        <!-- Input -->
        <input
          [id]="id"
          [type]="inputType"
          [placeholder]="placeholder"
          [formControl]="control"
          (blur)="onTouched()"
          [class.has-icon]="hasIcon"
          [class.has-toggle]="type === 'password'"
          class="auth-input-field"
        />

        <!-- Leading Icon -->
        <div *ngIf="hasIcon" class="leading-icon">
          <ng-content select="[icon]"></ng-content>
        </div>

        <!-- Password Toggle -->
        <button
          *ngIf="type === 'password'"
          type="button"
          (click)="togglePasswordVisibility()"
          class="password-toggle"
          [attr.aria-label]="inputType === 'password' ? 'Show password' : 'Hide password'"
          tabindex="-1">
            <svg *ngIf="inputType === 'password'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
            <svg *ngIf="inputType === 'text'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>

      <!-- Error Message -->
      <div *ngIf="hasError" class="error-message animate-fade-in-down">
         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
         <span>{{ errorMessage }}</span>
      </div>
    </div>
  `,
  styles: [`
    .auth-input-group {
      margin-bottom: 1rem;
      position: relative;
    }

    .input-label {
      display: block;
      font-size: 0.875rem; /* 14px */
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 0.375rem;
      transition: color 0.2s;
    }

    .auth-input-group:focus-within .input-label {
      color: var(--primary);
    }

    .required-mark {
      color: var(--error);
    }

    .input-wrapper {
      position: relative;
    }

    .auth-input-field {
      width: 100%;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem; /* 12px */
      padding: 0.75rem 1rem;
      color: var(--text-primary);
      font-size: 0.95rem;
      transition: all 0.2s;
      outline: none;

      &::placeholder {
        color: var(--text-tertiary);
      }

      &:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.1);
      }

      &.has-icon {
        padding-left: 2.5rem; /* 40px */
      }

      &.has-toggle {
        padding-right: 2.5rem;
      }
    }

    /* Error State */
    .error-state .auth-input-field {
      border-color: var(--error);

      &:focus {
        box-shadow: 0 0 0 4px rgba(var(--error-rgb), 0.1);
      }
    }

    /* Icons */
    .leading-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-tertiary);
      pointer-events: none;
      transition: color 0.2s;
      display: flex;
      align-items: center;
    }

    .auth-input-group:focus-within .leading-icon {
      color: var(--primary);
    }

    .password-toggle {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-tertiary);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      transition: color 0.2s, background-color 0.2s;

      &:hover {
        color: var(--text-primary);
        background-color: rgba(255, 255, 255, 0.05);
      }
    }

    .error-message {
      margin-top: 0.375rem;
      display: flex;
      align-items: flex-start;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--error);
    }

    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-down { animation: fadeInDown 0.2s ease-out forwards; }
  `]
})
export class AuthInputComponent implements ControlValueAccessor {
  @Input() id = `input-${Math.random().toString(36).substr(2, 9)}`;
  @Input() label = '';
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() hasIcon = false;
  @Input() errorMessage = '';

  control = new FormControl();
  inputType = 'text';

  // Value Accessor methods
  onChange = (value: any) => {};
  onTouched = () => {};

  ngOnInit() {
    this.inputType = this.type;
  }

  togglePasswordVisibility() {
    this.inputType = this.inputType === 'password' ? 'text' : 'password';
  }

  get hasError(): boolean {
    return !!(this.control.invalid && (this.control.dirty || this.control.touched)) || !!this.errorMessage;
  }

  // ControlValueAccessor Interface Implementation
  writeValue(value: any): void {
    this.control.setValue(value, { emitEvent: false });
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
    this.control.valueChanges.subscribe(fn);
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    isDisabled ? this.control.disable() : this.control.enable();
  }
}
