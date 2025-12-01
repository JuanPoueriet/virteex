// app/features/auth/set-password/set-password.page.ts

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Lock, Eye, EyeOff, AlertCircle, Check, X } from 'lucide-angular';
import { ReCaptchaV3Service, RecaptchaV3Module } from 'ng-recaptcha-19';
import { AuthService } from '../../../core/services/auth';

// Validadores (copiados de reset-password para consistencia)
const strongPasswordValidator = (): ValidatorFn => {
    return (control: AbstractControl): ValidationErrors | null => {
        const v: string = control.value || '';
        const hasAll = /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v) && /[!@#$%^&*(),.?":{}|<>]/.test(v);
        return hasAll ? null : { strongPassword: true };
    };
};

const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
};

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule, RecaptchaV3Module],
  templateUrl: './set-password.page.html',
  styleUrls: ['../reset-password/reset-password.page/reset-password.page.scss'], // Reutilizamos el estilo
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetPasswordPage implements OnInit {
  // --- Inyección de dependencias ---
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly recaptchaV3Service = inject(ReCaptchaV3Service);
  private readonly cdRef = inject(ChangeDetectorRef);

  // --- Estado del componente ---
  token: string | null = null;
  userName: string | null = null;
  setPasswordForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  passwordVisible = false;
  confirmPasswordVisible = false;
  showPasswordHints = false;

  // --- Iconos para la plantilla ---
  protected readonly LockIcon = Lock;
  protected readonly EyeIcon = Eye;
  protected readonly EyeOffIcon = EyeOff;
  protected readonly AlertCircleIcon = AlertCircle;
  protected readonly CheckIcon = Check;
  protected readonly XIcon = X;

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    
    // Construir el formulario
    this.setPasswordForm = this.fb.group({
      passwordGroup: this.fb.group({
        password: ['', [Validators.required, Validators.minLength(8), strongPasswordValidator()]],
        confirmPassword: ['', Validators.required],
      }, { validators: passwordMatchValidator })
    });

    // Si tenemos un token, buscamos el nombre del usuario
    if (this.token) {
      this.authService.getInvitationDetails(this.token).subscribe({
        next: (data) => {
          this.userName = data.firstName;
          this.cdRef.markForCheck(); // Notificar a Angular que actualice la vista
        },
        error: () => {
          this.errorMessage = 'Este enlace de invitación no es válido o ha expirado.';
          this.token = null; // Invalidar el token para que el formulario no se muestre
          this.cdRef.markForCheck();
        }
      });
    } else {
      this.errorMessage = 'No se ha proporcionado un token de invitación.';
    }
  }

  // --- Getters para facilitar el acceso desde la plantilla ---
  get passwordGroup() { return this.setPasswordForm.get('passwordGroup') as FormGroup; }
  get passwordValue(): string { return this.passwordGroup.get('password')?.value || ''; }

  // --- Lógica del envío del formulario ---
  onSubmit(): void {
    if (this.passwordGroup.invalid || !this.token) {
      this.passwordGroup.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.recaptchaV3Service.execute('setPassword').subscribe({
      next: (recaptchaToken) => {
        // NOTA: Recuerda actualizar tu DTO y servicio en NestJS para aceptar `recaptchaToken`
        this.authService.setPasswordFromInvitation(this.token!, this.passwordValue /*, recaptchaToken*/).subscribe({
          next: () => {
            // El servicio ya gestiona el inicio de sesión, solo redirigimos
            this.router.navigate(['/app/dashboard']);
          },
          error: (err:any) => {
            this.isLoading = false;
            this.errorMessage = err.message || 'Hubo un problema al activar tu cuenta.';
            this.cdRef.markForCheck();
          }
        });
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'No se pudo verificar la solicitud. Inténtalo de nuevo.';
        this.cdRef.markForCheck();
      }
    });
  }
  
  // --- Funciones de ayuda para los validadores visuales ---
  hasUpperCase(v: string): boolean { return /[A-Z]/.test(v); }
  hasLowerCase(v: string): boolean { return /[a-z]/.test(v); }
  hasNumber(v: string): boolean { return /[0-9]/.test(v); }
  hasSpecialChar(v: string): boolean { return /[!@#$%^&*(),.?":{}|<>]/.test(v); }

  onPasswordBlur(): void {
    setTimeout(() => { this.showPasswordHints = false; this.cdRef.detectChanges(); }, 150);
  }
}