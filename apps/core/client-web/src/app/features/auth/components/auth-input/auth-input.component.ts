import { Component, input, linkedSignal, ChangeDetectionStrategy, forwardRef, computed } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, FormControl } from '@angular/forms';

@Component({
  selector: 'app-auth-input',
  imports: [ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AuthInputComponent),
      multi: true
    }
  ],
  templateUrl: './auth-input.component.html',
  styleUrls: ['./auth-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthInputComponent implements ControlValueAccessor {
  id = input<string>(`input-${Math.random().toString(36).substr(2, 9)}`);
  label = input<string>('');
  type = input<string>('text');
  placeholder = input<string>('');
  required = input<boolean>(false);
  hasIcon = input<boolean>(false);
  errorMessage = input<string>('');
  autocomplete = input<string>('');
  showForgotPassword = input<boolean>(false);

  control = new FormControl();

  // Reset inputType when type input changes
  inputType = linkedSignal(() => this.type());

  // Value Accessor methods
  onChange = (value: any) => {};
  onTouched = () => {};

  togglePasswordVisibility() {
    this.inputType.update(current => current === 'password' ? 'text' : 'password');
  }

  get hasError(): boolean {
    return !!(this.control.invalid && (this.control.dirty || this.control.touched)) || !!this.errorMessage();
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
