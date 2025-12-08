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
    <div class="mb-4 group">
      <label *ngIf="label" [for]="id" class="block text-sm font-medium text-text-secondary mb-1.5 transition-colors group-focus-within:text-primary">
        {{ label }} <span *ngIf="required" class="text-error">*</span>
      </label>

      <div class="relative">
        <!-- Input -->
        <input
          [id]="id"
          [type]="inputType"
          [placeholder]="placeholder"
          [formControl]="control"
          (blur)="onTouched()"
          [class.pl-10]="hasIcon"
          [class.pr-10]="type === 'password'"
          [class.border-error]="hasError"
          class="w-full bg-bg-secondary border border-border-color rounded-xl py-3 px-4 text-text-primary placeholder-text-tertiary focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
        />

        <!-- Leading Icon -->
        <div *ngIf="hasIcon" class="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none transition-colors group-focus-within:text-primary">
          <ng-content select="[icon]"></ng-content>
        </div>

        <!-- Password Toggle -->
        <button
          *ngIf="type === 'password'"
          type="button"
          (click)="togglePasswordVisibility()"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors focus:outline-none p-1 rounded-md hover:bg-white/5"
          [attr.aria-label]="inputType === 'password' ? 'Show password' : 'Hide password'"
          tabindex="-1">
            <svg *ngIf="inputType === 'password'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
            <svg *ngIf="inputType === 'text'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>

      <!-- Error Message -->
      <div *ngIf="hasError" class="mt-1.5 flex items-start gap-1.5 text-xs text-error animate-fade-in-down">
         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
         <span>{{ errorMessage }}</span>
      </div>
    </div>
  `,
  styles: [`
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
