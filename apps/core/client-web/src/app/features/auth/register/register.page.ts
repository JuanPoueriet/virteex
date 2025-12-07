
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ReCaptchaV3Service, RecaptchaV3Module } from 'ng-recaptcha-19';

import { AuthLayoutComponent } from '../components/auth-layout/auth-layout.component';
import { AuthInputComponent } from '../components/auth-input/auth-input.component';
import { AuthButtonComponent } from '../components/auth-button/auth-button.component';
import { SocialLoginComponent } from '../components/social-login/social-login.component';

import { AuthService } from '../../../core/services/auth';
import { RegisterPayload } from '../../../shared/interfaces/register-payload.interface';

import { LucideAngularModule, Mail, Lock, User, Building, MapPin, Hash, Briefcase } from 'lucide-angular';

@Component({
  selector: 'app-register',
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
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss']
})
export class RegisterPage implements OnInit {
  MailIcon = Mail;
  LockIcon = Lock;
  UserIcon = User;
  BuildingIcon = Building;
  MapPinIcon = MapPin;
  HashIcon = Hash;
  BriefcaseIcon = Briefcase;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private recaptchaV3Service = inject(ReCaptchaV3Service);

  registerForm!: FormGroup;
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/)]],
      organizationName: ['', [Validators.required, Validators.minLength(2)]],
      taxId: [''],
      fiscalRegionId: ['', [Validators.required]],
      industry: [''],
      companySize: [''],
    });

    this.registerForm.patchValue({ fiscalRegionId: '00000000-0000-0000-0000-000000000000' });
  }

  get f() { return this.registerForm.controls; }

  async onSubmit() {
    this.errorMessage.set(null);
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    try {
      const token = await this.recaptchaV3Service.execute('register').toPromise();

      const data: RegisterPayload = {
        ...this.registerForm.getRawValue(),
        recaptchaToken: token || ''
      };

      this.authService.register(data).subscribe({
        next: (response) => {
            this.isLoading.set(false);
        },
        error: (err) => {
            this.handleError(err);
        }
      });
    } catch (e) {
      this.errorMessage.set('REGISTER.ERRORS.SERVER_ERROR');
      this.isLoading.set(false);
    }
  }

  private handleError(err: any) {
    this.isLoading.set(false);
    if (err.error && typeof err.error.message === 'string') {
        this.errorMessage.set(err.error.message);
    } else {
        this.errorMessage.set('REGISTER.ERRORS.SERVER_ERROR');
    }
  }

  onSocialLogin(provider: string) {
    const apiUrl = `${window.location.origin}/api/v1/auth`;
    window.location.href = `${apiUrl}/${provider}`;
  }
}
