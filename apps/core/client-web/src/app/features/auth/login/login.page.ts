import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';
import { LanguageService } from '../../../core/services/language';
import { CountryService } from '../../../core/services/country.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RecaptchaV3Module, ReCaptchaV3Service } from 'ng-recaptcha-19';

// Shared Components
import { AuthLayoutComponent } from '../components/auth-layout/auth-layout.component';
import { AuthInputComponent } from '../components/auth-input/auth-input.component';
import { AuthButtonComponent } from '../components/auth-button/auth-button.component';
import { SocialAuthButtonsComponent } from '../components/social-auth-buttons/social-auth-buttons.component';
import { PasskeyButtonComponent } from '../components/passkey-button/passkey-button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    RecaptchaV3Module,
    AuthLayoutComponent,
    AuthInputComponent,
    AuthButtonComponent,
    SocialAuthButtonsComponent,
    PasskeyButtonComponent
  ],
  providers: [ReCaptchaV3Service],
  templateUrl: './login.page.html',
})
export class LoginPage implements OnInit {
  // Services
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private recaptchaV3Service = inject(ReCaptchaV3Service);
  private translate = inject(TranslateService);

  public languageService = inject(LanguageService);
  public countryService = inject(CountryService);

  // State
  loginForm!: FormGroup;
  otpCodeControl = this.fb.control('', [Validators.required, Validators.minLength(6)]);

  errorMessage = signal<string | null>(null);
  isLoggingIn = signal(false);
  show2faInput = signal(false);
  tempToken = signal<string | null>(null);

  ngOnInit() {
    this.countryService.detectAndSetCountry();

    this.route.paramMap.subscribe(params => {
      const lang = params.get('lang');
      if (lang) {
        this.languageService.setLanguage(lang);
      }
    });

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [true],
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.loginForm.get(controlName);
    if (control?.touched && control?.errors) {
      if (control.errors['required']) {
        return controlName === 'email' ? 'LOGIN.ERRORS.EMAIL_REQUIRED' : 'LOGIN.ERRORS.PASSWORD_REQUIRED';
      }
      if (control.errors['email']) {
        return 'LOGIN.ERRORS.EMAIL_INVALID';
      }
    }
    return '';
  }

  socialLogin(provider: string) {
    const apiUrl = `${window.location.origin}/api/v1/auth`;
    window.location.href = `${apiUrl}/${provider}`;
  }

  onLoginWithPasskey(): void {
    const email = this.loginForm.get('email')?.value;
    this.isLoggingIn.set(true);
    this.errorMessage.set(null);

    this.authService.loginWithPasskey(email || undefined)
      .then((user) => {
        if (user) {
          this.handleSuccess(user);
        }
        this.isLoggingIn.set(false);
      })
      .catch((err) => {
        console.error('Passkey login error:', err);
        this.errorMessage.set('LOGIN.ERRORS.PASSKEY_ERROR');
        this.isLoggingIn.set(false);
      });
  }

  onSubmit(): void {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;

    this.isLoggingIn.set(true);
    this.errorMessage.set(null);

    this.recaptchaV3Service.execute('login').subscribe({
      next: (token) => {
        const { email, password, rememberMe } = this.loginForm.getRawValue();

        this.authService.login({ email, password, recaptchaToken: token, rememberMe }).subscribe({
          next: (response: any) => {
            if (response && response.require2fa) {
              this.tempToken.set(response.tempToken);
              this.show2faInput.set(true);
              this.isLoggingIn.set(false);
            } else {
              this.handleSuccess(response); // response is User object here per AuthService logic
            }
          },
          error: (err) => {
            this.handleError(err);
            this.isLoggingIn.set(false);
          }
        });
      },
      error: (err) => {
        console.error('ReCaptcha Error:', err);
        this.errorMessage.set('LOGIN.ERRORS.SERVER_ERROR');
        this.isLoggingIn.set(false);
      }
    });
  }

  verify2fa(): void {
    if (this.otpCodeControl.invalid || !this.tempToken()) return;

    this.isLoggingIn.set(true);
    this.errorMessage.set(null);

    this.authService.verify2fa(this.otpCodeControl.value!, this.tempToken()!).subscribe({
      next: (user) => {
        this.handleSuccess(user);
      },
      error: (err) => {
        this.errorMessage.set('LOGIN.ERRORS.INVALID_CODE');
        this.isLoggingIn.set(false);
      }
    });
  }

  private handleSuccess(user: any): void {
    if (user && user.preferredLanguage) {
      this.languageService.setLanguage(user.preferredLanguage);
    }
    this.router.navigate(['/app/dashboard']);
    this.isLoggingIn.set(false);
  }

  private handleError(err: any): void {
    console.error('Login error:', err);
    if (err && err.status) {
      switch (err.status) {
        case 401: this.errorMessage.set('LOGIN.ERRORS.AUTH_INVALID_CREDENTIALS'); break;
        case 429: this.errorMessage.set('LOGIN.ERRORS.TOO_MANY_ATTEMPTS'); break;
        case 403: this.errorMessage.set('LOGIN.ERRORS.ACCOUNT_LOCKED'); break;
        default: this.errorMessage.set('LOGIN.ERRORS.SERVER_ERROR');
      }
    } else {
      this.errorMessage.set('LOGIN.ERRORS.SERVER_ERROR');
    }
  }
}
