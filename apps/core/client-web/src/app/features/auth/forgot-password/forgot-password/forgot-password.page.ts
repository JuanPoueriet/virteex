import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth';
import { RECAPTCHA_V3_SITE_KEY, RecaptchaV3Module, ReCaptchaV3Service } from 'ng-recaptcha-19';
import { environment } from '../../../../../environments/environment';
import { LucideAngularModule, Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-angular';
// Importa switchMap para encadenar observables
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  
  providers: [
    ReCaptchaV3Service,
    { provide: RECAPTCHA_V3_SITE_KEY, useValue: environment.recaptcha.siteKey }
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RecaptchaV3Module,
    RouterModule,
    LucideAngularModule
  ]
})
export class ForgotPasswordPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private recaptchaV3Service = inject(ReCaptchaV3Service);

  forgotPasswordForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Iconos
  MailIcon = Mail;
  AlertCircleIcon = AlertCircle;
  CheckCircleIcon = CheckCircle;
  ArrowLeftIcon = ArrowLeft;

  constructor() {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get email() {
    return this.forgotPasswordForm.get('email');
  }

  onSubmit() {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    // --- CADENA DE OBSERVABLES CORREGIDA CON switchMap ---
    this.recaptchaV3Service.execute('forgotPassword').pipe(
      switchMap((recaptchaToken) => {
        const email = this.forgotPasswordForm.value.email;
        return this.authService.forgotPassword(email, recaptchaToken);
      })
    ).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = response.message || 'Si existe una cuenta con ese correo, se ha enviado un enlace para restablecer la contraseña.';
        this.forgotPasswordForm.reset(); // Opcional: limpiar el formulario
      },
      error: (err) => {
        this.isLoading = false;
        // Corregido para usar err.message, que es lo que nuestro handleError devuelve
        this.errorMessage = err.message || 'Error al enviar las instrucciones. Por favor, intenta de nuevo.';
      }
    });
  }
}