
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ReCaptchaV3Service, RecaptchaV3Module } from 'ng-recaptcha-19';

// Components
import { AuthLayoutComponent } from '../components/auth-layout/auth-layout.component';
import { AuthInputComponent } from '../components/auth-input/auth-input.component';
import { AuthButtonComponent } from '../components/auth-button/auth-button.component';
import { SocialLoginComponent } from '../components/social-login/social-login.component';

// Services & Interfaces
import { AuthService } from '../auth.service';
import { CountryService } from '../../../core/services/country.service';
import { LanguageService } from '../../../core/services/language';
import { LoginUserDto } from '../interfaces/auth.interfaces';

// Icons
import { LucideAngularModule, Mail, Lock, Key, ArrowLeft } from 'lucide-angular';

@Component({
  selector: 'app-login',
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
    AuthButtonComponent,
    SocialLoginComponent
  ],
  providers: [ReCaptchaV3Service],
  templateUrl: './login.page.html'
})
export class LoginPage implements OnInit {
  // Icons
  MailIcon = Mail;
  LockIcon = Lock;
  KeyIcon = Key;
  ArrowLeftIcon = ArrowLeft;

  // Services
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private recaptchaV3Service = inject(ReCaptchaV3Service);
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);

  // State
  loginForm!: FormGroup;
  otpForm!: FormGroup;

  // Signals
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  show2fa = signal<boolean>(false);
  tempToken = signal<string | null>(null);

  ngOnInit() {
    this.countryService.detectAndSetCountry();

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [true]
    });

    this.otpForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  get emailControl() { return this.loginForm.get('email')!; }
  get passwordControl() { return this.loginForm.get('password')!; }
  get otpControl() { return this.otpForm.get('code')!; }

  async onSubmit() {
    this.errorMessage.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    try {
      const token = await this.recaptchaV3Service.execute('login').toPromise();

      const credentials: LoginUserDto = {
        ...this.loginForm.getRawValue(),
        recaptchaToken: token || ''
      };

      this.authService.login(credentials).subscribe({
        next: (response) => {
          if ('require2fa' in response && response.require2fa) {
            this.tempToken.set(response.tempToken);
            this.show2fa.set(true);
            this.isLoading.set(false);
          } else {
             this.handleSuccess(response);
          }
        },
        error: (err) => {
          this.handleError(err);
        }
      });
    } catch (e) {
      this.errorMessage.set('LOGIN.ERRORS.SERVER_ERROR');
      this.isLoading.set(false);
    }
  }

  onVerify2fa() {
    if (this.otpForm.invalid || !this.tempToken()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const code = this.otpControl.value;

    this.authService.verify2fa(code, this.tempToken()!).subscribe({
        next: (user) => {
            // Depending on verify2fa response, currently it returns User object or LoginResponseDto
            // Assuming the authService logic maps it or handles the token storage.
            // If the service mapped it to User, we are good.
            // If it returned the full DTO, we might need to handle language setting.
            // Based on previous code, verify2fa returns Observable<User>.
            if (user.preferredLanguage) {
                this.languageService.setLanguage(user.preferredLanguage);
            }
            this.router.navigate(['/app/dashboard']);
            this.isLoading.set(false);
        },
        error: (err) => this.handleError(err)
    });
  }

  onSocialLogin(provider: string) {
    const apiUrl = `${window.location.origin}/api/v1/auth`;
    window.location.href = `${apiUrl}/${provider}`;
  }

  onPasskeyLogin() {
    const email = this.loginForm.get('email')?.value;
    this.isLoading.set(true);
    this.authService.loginWithPasskey(email || undefined)
      .then((user) => {
        if(user) {
            this.router.navigate(['/app/dashboard']);
        }
        this.isLoading.set(false);
      })
      .catch(() => {
        this.errorMessage.set('LOGIN.ERRORS.PASSKEY_FAILED');
        this.isLoading.set(false);
      });
  }

  private handleSuccess(response: any) {
    // Check if user has preferred language
    if (response?.user?.preferredLanguage) {
      this.languageService.setLanguage(response.user.preferredLanguage);
    }
    this.router.navigate(['/app/dashboard']);
    this.isLoading.set(false);
  }

  private handleError(err: any) {
    this.isLoading.set(false);
    if (err.status === 401) {
      this.errorMessage.set('LOGIN.ERRORS.INVALID_CREDENTIALS');
    } else if (err.status === 429) {
      this.errorMessage.set('LOGIN.ERRORS.TOO_MANY_ATTEMPTS');
    } else if (err.status === 403) {
      this.errorMessage.set('LOGIN.ERRORS.ACCOUNT_LOCKED');
    } else {
      this.errorMessage.set('LOGIN.ERRORS.SERVER_ERROR');
    }
  }

  cancel2fa() {
      this.show2fa.set(false);
      this.otpForm.reset();
      this.tempToken.set(null);
  }
}
