import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth';
import { LucideAngularModule, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Check, X } from 'lucide-angular';

const strongPasswordValidator = (): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const v: string = control.value || '';
    const ok =
      /[a-z]/.test(v) &&        // minúscula
      /[A-Z]/.test(v) &&        // mayúscula
      /[0-9]/.test(v) &&        // número
      /[!@#$%^&*(),.?":{}|<>]/.test(v); // símbolo
    return ok ? null : { strongPassword: true };
  };
};

const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-reset-password-page',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule
  ]
})
export class ResetPasswordPage implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  resetPasswordForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  token: string | null = null;
  passwordVisible = false;
  confirmPasswordVisible = false;

  // Icons
  LockIcon = Lock;
  EyeIcon = Eye;
  EyeOffIcon = EyeOff;
  AlertCircleIcon = AlertCircle;
  CheckCircleIcon = CheckCircle;
  showPasswordHints = false;
  protected readonly CheckIcon = Check;
  protected readonly XIcon = X;
  private cdRef = inject(ChangeDetectorRef);

  ngOnInit(): void {
    // this.token = this.route.snapshot.paramMap.get('token');
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token || this.token.length < 30) {
      this.errorMessage = "Token de restablecimiento inválido";
    }

    // ✅ Crear el form con el grupo 'passwordGroup'
    this.resetPasswordForm = this.fb.group({
      passwordGroup: this.fb.group(
        {
          password: ['', [Validators.required, Validators.minLength(8), strongPasswordValidator()]],
          confirmPassword: ['', Validators.required],
        },
        { validators: passwordMatchValidator }
      )
    });
  }

  get passwordGroup() {
    return this.resetPasswordForm.get('passwordGroup') as FormGroup;
  }

  onSubmit() {
    const group = this.passwordGroup;
    if (!group || group.invalid || !this.token) {
      group?.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const newPassword = group.value.password;

    this.authService.resetPassword(this.token, newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Tu contraseña ha sido actualizada con éxito. Serás redirigido para iniciar sesión.';
        setTimeout(() => this.router.navigate(['/auth/login']), 3000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.customMessage || 'El enlace ha expirado o es inválido. Por favor, solicita uno nuevo.';
      }
    });
  }

  hasUpperCase(value: string): boolean { return /[A-Z]/.test(value); }
  hasLowerCase(value: string): boolean { return /[a-z]/.test(value); }
  hasNumber(value: string): boolean { return /[0-9]/.test(value); }
  hasSpecialChar(value: string): boolean { return /[!@#$%^&*(),.?":{}|<>]/.test(value); }

  get passwordValue(): string { return this.passwordGroup?.get?.('password')?.value || ''; }

  onPasswordBlur() {
    if (!document.activeElement?.id.includes('confirmPassword')) {
      setTimeout(() => {
        this.showPasswordHints = false;
        this.cdRef.detectChanges();
      }, 200);
    }
  }
}
