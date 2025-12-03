// ../app/features/auth/register/register.page.ts

import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AlertCircle, ArrowLeft, ArrowRight, BarChart2, Check, CheckCircle, LucideAngularModule, Package, Rocket } from 'lucide-angular';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AuthService } from '../../../core/services/auth';
import { RegisterPayload } from '../../../shared/interfaces/register-payload.interface';
import { StepAccountInfo } from './steps/step-account-info/step-account-info';
import { StepBusiness } from './steps/step-business/step-business';
import { StepConfiguration } from './steps/step-configuration/step-configuration';
import { StepPlan } from './steps/step-plan/step-plan';
import { strongPasswordValidator } from '../../../shared/validators/password.validator';
import { RECAPTCHA_V3_SITE_KEY, RecaptchaV3Module, ReCaptchaV3Service } from 'ng-recaptcha-19';
import { environment } from '../../../../environments/environment';
import { LanguageService } from '../../../core/services/language';
import { CountryService } from '../../../core/services/country.service';
import { GeoMismatchModalComponent } from '../../../shared/components/geo-mismatch-modal/geo-mismatch-modal.component';

export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    RouterLink,
    StepAccountInfo,
    StepBusiness,
    StepConfiguration,
    StepPlan,
    RecaptchaV3Module,
    GeoMismatchModalComponent
  ],
  
  providers: [
    ReCaptchaV3Service,
    { provide: RECAPTCHA_V3_SITE_KEY, useValue: environment.recaptcha.siteKey }
  ],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  animations: [
    trigger('stepAnimation', [
      transition(':increment', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':decrement', [
        style({ transform: 'translateX(-100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class RegisterPage implements OnInit {
  protected readonly CheckCircleIcon = CheckCircle;
  protected readonly BarChart2Icon = BarChart2;
  protected readonly PackageIcon = Package;
  protected readonly CheckIcon = Check;
  protected readonly ArrowLeftIcon = ArrowLeft;
  protected readonly ArrowRightIcon = ArrowRight;
  protected readonly RocketIcon = Rocket;
    protected readonly AlertCircleIcon = AlertCircle; // Nuevo icono para errores

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private recaptchaV3Service = inject(ReCaptchaV3Service);
  public countryService = inject(CountryService);

    public languageService = inject(LanguageService); // FIX: Inyectar y hacer público el servicio


  currentStep = signal(1);
  registerForm!: FormGroup;
  errorMessage = signal<string | null>(null);
  isRegistering = signal(false);
  stepsCompleted = signal<boolean[]>(new Array(4).fill(false));

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      accountInfo: this.fb.group({
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        jobTitle: [''],
        phone: [''],
        avatarUrl: [null],
        email: ['', [Validators.required, Validators.email]],
        passwordGroup: this.fb.group({
          password: ['', [
            Validators.required,
            Validators.minLength(8),
            strongPasswordValidator()
          ]],
          confirmPassword: ['', [Validators.required]],
        }, { validators: passwordMatchValidator }),
      }),
      business: this.fb.group({
        companyName: ['', [Validators.required]],
        fiscalRegionId: ['', [Validators.required]],
        industry: ['', [Validators.required]],
        legalForm: [''],
        numberOfEmployees: [''],
        website: [''],
        logoFile: [null],
      }),
      configuration: this.fb.group({
        address: [''], city: [''], stateOrProvince: [''], postalCode: [''],
        country: [this.countryService.currentCountry()?.code || 'DO', [Validators.required]],
        companyPhone: ['', [Validators.required]],
        taxId: ['', [Validators.required]], // Will get custom validators in ngOnInit
        naicsCode: [''],
        currency: [this.countryService.currentCountry()?.currencyCode || 'DOP', [Validators.required]],
        defaultTaxRate: [0],
        fiscalYearStart: ['01-01'],
        timezone: ['America/Santo_Domingo', [Validators.required]],
      }),
      plan: this.fb.group({
        planId: ['trial', [Validators.required]],
        agreeToTerms: [false, [Validators.requiredTrue]],
        marketingOptIn: [true],
      }),
    });

    // Apply Dynamic Validators based on Country Config
    const countryConfig = this.countryService.currentCountry();
    if (countryConfig && countryConfig.formSchema?.taxId) {
       const taxIdControl = this.registerForm.get('configuration.taxId');
       if (taxIdControl) {
         taxIdControl.addValidators(Validators.pattern(countryConfig.formSchema.taxId.pattern));
         taxIdControl.updateValueAndValidity();
       }
    }
  }

  nextStep(): void {
    const currentForm = this.getCurrentStepForm();
    if (currentForm?.invalid) {
      currentForm.markAllAsTouched();
      this.errorMessage.set('Por favor, completa los campos requeridos correctamente.');
      return;
    }

    this.stepsCompleted.update(completed => {
      const newCompleted = [...completed];
      newCompleted[this.currentStep() - 1] = true;
      return newCompleted;
    });

    if (this.currentStep() < 4) {
      this.currentStep.update(step => step + 1);
      this.errorMessage.set(null);
    }
  }

  navigateToStep(stepIndex: number): void {
    if (stepIndex < this.currentStep() && this.stepsCompleted()[stepIndex - 1]) {
      this.currentStep.set(stepIndex);
    }
  }

  get accountInfo() { return this.registerForm.get('accountInfo') as FormGroup; }
  get business() { return this.registerForm.get('business') as FormGroup; }
  get configuration() { return this.registerForm.get('configuration') as FormGroup; }
  get plan() { return this.registerForm.get('plan') as FormGroup; }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
    }
  }

  private getCurrentStepForm(): FormGroup | null {
    const stepNames = ['accountInfo', 'business', 'configuration', 'plan'];
    const currentStepName = stepNames[this.currentStep() - 1];
    return this.registerForm.get(currentStepName) as FormGroup;
  }

  private findFirstInvalidStep(): number {
    const stepNames = ['accountInfo', 'business', 'configuration', 'plan'];
    for (let i = 0; i < stepNames.length; i++) {
      const stepGroup = this.registerForm.get(stepNames[i]) as FormGroup;
      if (stepGroup.invalid) {
        return i + 1;
      }
    }
    return 1;
  }

  onSubmit(): void {
    this.markAllAsTouched();

    if (this.registerForm.invalid) {
        const firstInvalidStep = this.findFirstInvalidStep();
        this.currentStep.set(firstInvalidStep);
        this.errorMessage.set('Por favor, completa todos los campos requeridos correctamente.');
        return;
    }

    this.isRegistering.set(true);
    this.errorMessage.set(null);

    this.recaptchaV3Service.execute('register').subscribe({
        next: (recaptchaToken) => {
            const formValue = this.registerForm.getRawValue();
            const payload: RegisterPayload = {
                firstName: formValue.accountInfo.firstName,
                lastName: formValue.accountInfo.lastName,
                email: formValue.accountInfo.email,
                password: formValue.accountInfo.passwordGroup.password,
                organizationName: formValue.business.companyName,
                fiscalRegionId: formValue.business.fiscalRegionId,
                rnc: formValue.configuration.taxId,
                recaptchaToken
            };

            this.authService.register(payload).subscribe({
                next: (response: any) => {
                    this.isRegistering.set(false);
                    // Automatically login after register if the backend returns token, or prompt user to login.
                    // Assuming for "robustness" we want to reduce friction.
                    // If the backend auto-logs in, we might have tokens in cookies.

                    // Navigate to Plan Selection
                    this.router.navigate(['/auth/plan-selection']);
                },
                error: (err) => {
                    if (err.status === 409) {
                        this.errorMessage.set('El correo electrónico ya está registrado. Por favor usa otro correo.');
                    } else if (err.status === 400 && err.error?.details) {
                        this.handleFieldErrors(err.error.details);
                    } else {
                        this.errorMessage.set(err.customMessage || 'Ocurrió un error inesperado durante el registro.');
                    }
                    this.isRegistering.set(false);
                }
            });
        },
        error: (err) => {
            this.errorMessage.set('Error al validar reCAPTCHA.');
            this.isRegistering.set(false);
        }
    });
  }

  private markAllAsTouched() {
    Object.values(this.registerForm.controls).forEach(control => {
      if (control instanceof FormGroup) {
        Object.values(control.controls).forEach(subControl => {
          subControl.markAsTouched();
        });
      } else {
        control.markAsTouched();
      }
    });
  }

  private handleFieldErrors(details: any[]) {
    let firstErrorStep = 4;

    details.forEach((err: any) => {
      const field = err.field;
      const control = this.findControlInForm(field);

      if (control) {
        control.setErrors({ serverError: err.message });
        const step = this.getStepForField(field);
        if (step < firstErrorStep) firstErrorStep = step;
      }
    });

    if (firstErrorStep < 4) {
      this.currentStep.set(firstErrorStep);
      this.errorMessage.set('Por favor, corrige los errores en los campos resaltados.');
    } else {
      this.errorMessage.set('Por favor, completa todos los campos requeridos correctamente.');
    }
  }

  private findControlInForm(controlPath: string): AbstractControl | null {
    const paths = controlPath.split('.');
    let currentControl: AbstractControl | null = this.registerForm;

    for (const path of paths) {
      if (currentControl instanceof FormGroup) {
        currentControl = currentControl.get(path);
      } else {
        return null;
      }
    }
    return currentControl;
  }

  private getStepForField(field: string): number {
    if (field.startsWith('accountInfo')) return 1;
    if (field.startsWith('business')) return 2;
    if (field.startsWith('configuration')) return 3;
    return 4;
  }
}