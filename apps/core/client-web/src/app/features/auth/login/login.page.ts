import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
  signal, OnDestroy,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';
import {
  LucideAngularModule,
  Mail,
  Lock,
  EyeOff,
  Eye,
  AlertCircle,
  Globe,
  ChevronDown,
  ChevronUp,
  Languages,
  Check,
  Key
} from 'lucide-angular';
import { RecaptchaV3Module, ReCaptchaV3Service } from 'ng-recaptcha-19';
import { LanguageService } from '../../../core/services/language';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CountryService } from '../../../core/services/country.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    RecaptchaV3Module,
    TranslateModule,
  ],
  providers: [ReCaptchaV3Service],
})
export class LoginPage implements OnInit {
  // --- Iconos para la UI ---
  MailIcon = Mail;
  LockIcon = Lock;
  EyeIcon = Eye;
  EyeOffIcon = EyeOff;
  GlobeIcon = Languages;
  AlertCircleIcon = AlertCircle;
  ChevronDown = ChevronDown;
  ChevronUp = ChevronUp;
  Check = Check;
  KeyIcon = Key;

  // --- Lógica para el menú de idiomas ---
  dropdownOpen = signal(false);
  isDropUp = signal(false);
  activeSelector = signal<'top' | 'footer' | null>(null);

  @ViewChild('topLanguageSelector') topLanguageSelector!: ElementRef;
  @ViewChild('footerLanguageSelector') footerLanguageSelector!: ElementRef;

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onWindowChange(): void {
    if (this.dropdownOpen()) {
      this.calculatePosition();
    }
  }


  // Inyectamos los servicios públicos para usarlos en el HTML
  public countryService = inject(CountryService);
  public languageService = inject(LanguageService);

  public translate: TranslateService = inject(TranslateService);

  // constructor(
  //   // public languageService: LanguageService,
  //   // public countryService: CountryService
  // ) {}

  // ngOnDestroy(): void {
  //   // Lógica de limpieza si es necesaria
  // }

  toggleDropdown(event: Event, selector: 'top' | 'footer'): void {
    event.stopPropagation();
    this.activeSelector.set(selector);
    this.dropdownOpen.update(open => !open);
    if (this.dropdownOpen()) {
      setTimeout(() => this.calculatePosition(), 0);
    }
  }

  changeLanguage(lang: string): void {
    if (lang !== this.languageService.currentLang()) {
      this.languageService.setLanguage(lang);
      this.router.navigate([`/${lang}/auth/login`]);
    }
    this.dropdownOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.dropdownOpen()) {
      const topSelector = this.topLanguageSelector?.nativeElement;
      const footerSelector = this.footerLanguageSelector?.nativeElement;
      
      if ((!topSelector || !topSelector.contains(event.target)) && 
          (!footerSelector || !footerSelector.contains(event.target))) {
        this.dropdownOpen.set(false);
      }
    }
  }
  
  private calculatePosition(): void {
    let currentSelector: ElementRef | null = null;
    
    if (this.activeSelector() === 'top') {
      currentSelector = this.topLanguageSelector;
    } else if (this.activeSelector() === 'footer') {
      currentSelector = this.footerLanguageSelector;
    }
    
    if (!currentSelector) return;
    
    const trigger = currentSelector.nativeElement.querySelector('.selector-trigger');
    const menu = currentSelector.nativeElement.querySelector('.dropdown-menu');
    
    if (!trigger || !menu) return;
    
    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    
    this.isDropUp.set(spaceBelow < menuRect.height && spaceAbove >= menuRect.height);
  }

  // --- Inyección de dependencias ---
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private recaptchaV3Service = inject(ReCaptchaV3Service);

  // --- Estado del Componente con Signals ---
  loginForm!: FormGroup;
  errorMessage = signal<string | null>(null);
  isLoggingIn = signal(false);
  passwordVisible = signal(false);

  // 2FA State
  show2faInput = signal(false);
  tempToken = signal<string | null>(null);
  otpCodeControl = this.fb.control('', [Validators.required, Validators.minLength(6)]);

  @ViewChild('formElement') formElement!: ElementRef<HTMLFormElement>;

  ngOnInit() {
    // IMPORTANTE: Detectamos el país para que los enlaces de registro sean correctos
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

  get email(): AbstractControl | null {
    return this.loginForm.get('email');
  }

  get password(): AbstractControl | null {
    return this.loginForm.get('password');
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  socialLogin(provider: string) {
    // Use the global window object to get the origin or configured base URL
    // In Angular we typically inject DOCUMENT or use environment, but for now we use location.origin
    // to dynamically construct the URL relative to where the frontend is served (assuming proxy).
    const apiUrl = `${window.location.origin}/api/v1/auth`;
    window.location.href = `${apiUrl}/${provider}`;
  }

  onLoginWithPasskey(): void {
    const email = this.loginForm.get('email')?.value;

    // We don't require email for passkey login strictly (can be discoverable),
    // but sending it if available helps the backend narrow down credentials.
    // If not available, we send undefined and backend/browser handles resident keys.

    this.isLoggingIn.set(true);
    this.errorMessage.set(null);

    this.authService.loginWithPasskey(email || undefined)
      .then((user) => {
        if (user) {
          if (user.preferredLanguage) {
            this.languageService.setLanguage(user.preferredLanguage);
          }
          this.router.navigate(['/app/dashboard']);
        }
        this.isLoggingIn.set(false);
      })
      .catch((err) => {
        console.error('Passkey login error:', err);
        // Map common webauthn errors if needed, or generic error
        this.errorMessage.set('Error al iniciar sesión con llave de acceso. Intente nuevamente o use su contraseña.');
        this.isLoggingIn.set(false);
      });
  }

  onSubmit(): void {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoggingIn.set(true);
    this.errorMessage.set(null);

    this.recaptchaV3Service.execute('login').subscribe({
      next: (token) => {
        const formValue = this.loginForm.getRawValue();
        const credentials = {
          email: formValue.email,
          password: formValue.password,
          recaptchaToken: token,
          rememberMe: formValue.rememberMe,
        };

        this.authService.login(credentials).subscribe({
          next: (response: any) => {
            if (response && response.require2fa) {
                this.tempToken.set(response.tempToken);
                this.show2faInput.set(true);
                this.isLoggingIn.set(false);
                return;
            }

            // User object returned directly
            if (response && response.preferredLanguage) {
              this.languageService.setLanguage(response.preferredLanguage);
            }
            this.router.navigate(['/app/dashboard']);
            this.isLoggingIn.set(false);
          },
          error: (err) => {
            console.error('Error en el inicio de sesión:', err);
            this.errorMessage.set(this.mapErrorToKey(err));
            this.isLoggingIn.set(false);
          },
        });
      },
      error: (err) => {
        console.error('Error al ejecutar reCAPTCHA:', err);
        this.errorMessage.set('LOGIN.ERRORS.SERVER_ERROR');
        this.isLoggingIn.set(false);
      },
    });
  }

  private mapErrorToKey(err: any): string {
    if (err && err.status) {
      switch (err.status) {
        case 401:
          return 'LOGIN.ERRORS.INVALID_CREDENTIALS';
        case 429:
          return 'LOGIN.ERRORS.TOO_MANY_ATTEMPTS';
        case 403:
          return 'LOGIN.ERRORS.ACCOUNT_LOCKED';
      }
    }
    return 'LOGIN.ERRORS.SERVER_ERROR';
  }

  verify2fa(): void {
      if (this.otpCodeControl.invalid || !this.tempToken()) {
          return;
      }

      this.isLoggingIn.set(true);
      this.errorMessage.set(null);

      this.authService.verify2fa(this.otpCodeControl.value!, this.tempToken()!).subscribe({
          next: (user) => {
              if (user.preferredLanguage) {
                  this.languageService.setLanguage(user.preferredLanguage);
              }
              this.router.navigate(['/app/dashboard']);
              this.isLoggingIn.set(false);
          },
          error: (err) => {
              this.isLoggingIn.set(false);
              this.errorMessage.set(err.error?.message || 'Código incorrecto');
          }
      });
  }
}
