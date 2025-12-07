
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ReCaptchaV3Service, RecaptchaV3Module } from 'ng-recaptcha-19';

import { AuthLayoutComponent } from '../components/auth-layout/auth-layout.component';
import { AuthInputComponent } from '../components/auth-input/auth-input.component';
import { AuthButtonComponent } from '../components/auth-button/auth-button.component';

import { AuthService } from '../../../core/services/auth';
import { LucideAngularModule, Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-angular';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    RecaptchaV3Module,
    LucideAngularModule,
    AuthLayoutComponent,
    AuthInputComponent,
    AuthButtonComponent
  ],
  providers: [ReCaptchaV3Service],
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss']
})
export class ForgotPasswordPage implements OnInit {
  MailIcon = Mail;
  ArrowLeftIcon = ArrowLeft;
  AlertCircleIcon = AlertCircle;
  CheckCircleIcon = CheckCircle;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private recaptchaV3Service = inject(ReCaptchaV3Service);

  form!: FormGroup;
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  ngOnInit() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get emailControl() { return this.form.get('email')!; }

  async onSubmit() {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    try {
      const token = await this.recaptchaV3Service.execute('forgot_password').toPromise();

      this.authService.forgotPassword(this.emailControl.value, token || '').subscribe({
        next: () => {
          this.successMessage.set('AUTH.FORGOT_PASSWORD.SUCCESS');
          this.isLoading.set(false);
          this.form.reset();
        },
        error: (err) => {
          this.errorMessage.set('AUTH.ERRORS.SERVER_ERROR');
          this.isLoading.set(false);
        }
      });
    } catch (e) {
      this.errorMessage.set('AUTH.ERRORS.SERVER_ERROR');
      this.isLoading.set(false);
    }
  }
}
