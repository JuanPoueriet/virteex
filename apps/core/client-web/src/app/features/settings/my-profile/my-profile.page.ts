import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  LucideAngularModule,
  User as UserIcon,
  Mail,
  Phone,
  Building2,
  Save,
  Image,
  Shield,
  Check,
} from 'lucide-angular';
import { AuthService } from '../../../core/services/auth';
import { NotificationService } from '../../../core/services/notification';
import { UsersService } from '../../../core/api/users.service';
import { SecuritySettingsComponent } from './security-settings.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-my-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, SecuritySettingsComponent, TranslateModule],
  templateUrl: './my-profile.page.html',
  styleUrls: ['./my-profile.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyProfilePage implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private usersService = inject(UsersService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  // Icons
  protected readonly UserIcon = UserIcon;
  protected readonly MailIcon = Mail;
  protected readonly PhoneIcon = Phone;
  protected readonly CompanyIcon = Building2;
  protected readonly SaveIcon = Save;
  protected readonly ImageIcon = Image;
  protected readonly ShieldIcon = Shield;
  protected readonly CheckIcon = Check;

  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  avatarPreview = signal<string | ArrayBuffer | null>(null);

  currentUser = this.authService.currentUser;
  isLoading = false;

  // Phone Verification State
  showPhoneModal = signal(false);
  isVerifyingPhone = signal(false);
  otpSent = signal(false);
  phoneControl = this.fb.control('', [Validators.required]);
  otpControl = this.fb.control('', [Validators.required, Validators.minLength(6)]);

  // Job Titles List (Loaded from backend)
  jobTitles = toSignal(this.usersService.getJobTitles(), { initialValue: [] });

  ngOnInit(): void {
    const user = this.currentUser();

    this.profileForm = this.fb.group({
      firstName: [user?.firstName, Validators.required],
      lastName: [user?.lastName, Validators.required],
      email: [user?.email, [Validators.required, Validators.email]],
      phone: [user?.phone || '', Validators.required],
      jobTitle: [user?.jobTitle || '', Validators.required],
      preferredLanguage: [user?.preferredLanguage || 'es']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    });

    if (user?.avatarUrl) {
      this.avatarPreview.set(user.avatarUrl);
    }
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      // Preview
      const reader = new FileReader();
      reader.onload = () => {
         this.avatarPreview.set(reader.result);
         this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);

      // Upload via UsersService
      this.usersService.uploadAvatar(file).subscribe({
          next: (res) => {
              this.notificationService.showSuccess('SETTINGS.PROFILE.AVATAR_UPDATED');
              this.authService.checkAuthStatus().subscribe(); // Refresh user
          },
          error: () => {
              this.notificationService.showError('SETTINGS.PROFILE.ERRORS.AVATAR_UPLOAD');
          }
      });
    }
  }

  // --- Phone Verification Logic ---

  openPhoneVerification() {
    this.showPhoneModal.set(true);
    this.otpSent.set(false);
    this.otpControl.reset();
    this.phoneControl.reset();
  }

  closePhoneVerification() {
    this.showPhoneModal.set(false);
  }

  sendPhoneOtp() {
    if (this.phoneControl.invalid) return;

    this.isVerifyingPhone.set(true);
    this.authService.sendPhoneOtp(this.phoneControl.value!).subscribe({
        next: () => {
            this.otpSent.set(true);
            this.isVerifyingPhone.set(false);
            this.notificationService.showSuccess('SETTINGS.PROFILE.OTP_SENT');
            this.cdr.markForCheck();
        },
        error: (err) => {
            this.isVerifyingPhone.set(false);
            this.notificationService.showError('SETTINGS.PROFILE.ERRORS.OTP_SEND');
            this.cdr.markForCheck();
        }
    });
  }

  verifyPhoneOtp() {
    if (this.otpControl.invalid || this.phoneControl.invalid) return;

    this.isVerifyingPhone.set(true);
    this.authService.verifyPhoneOtp(this.otpControl.value!, this.phoneControl.value!).subscribe({
        next: () => {
            this.isVerifyingPhone.set(false);
            this.notificationService.showSuccess('SETTINGS.PROFILE.PHONE_VERIFIED');
            this.showPhoneModal.set(false);

            // Reload user info to update UI state
            this.authService.checkAuthStatus().subscribe();
            this.cdr.markForCheck();
        },
        error: (err) => {
            this.isVerifyingPhone.set(false);
            this.notificationService.showError('SETTINGS.PROFILE.ERRORS.OTP_INVALID');
            this.cdr.markForCheck();
        }
    });
  }

  saveProfile(): void {
    if (this.profileForm.valid) {
      this.isLoading = true;
      const { firstName, lastName, preferredLanguage, email, phone, jobTitle } = this.profileForm.value;

      this.usersService.updateProfile({ firstName, lastName, preferredLanguage, email, phone, jobTitle }).subscribe({
        next: () => {
          this.notificationService.showSuccess('SETTINGS.PROFILE.UPDATED');
          // Update local state if needed via AuthService
          this.authService.checkAuthStatus().subscribe(); // Refresh user data
          this.profileForm.markAsPristine();
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error(err);
          this.notificationService.showError('SETTINGS.PROFILE.ERRORS.UPDATE_FAILED');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  changePassword(): void {
    if (this.passwordForm.valid) {
      if (
        this.passwordForm.value.newPassword !==
        this.passwordForm.value.confirmPassword
      ) {
        this.notificationService.showError('SETTINGS.PROFILE.ERRORS.PASSWORDS_DO_NOT_MATCH');
        return;
      }

      this.authService.changePassword(this.passwordForm.value).subscribe({
          next: () => {
              this.notificationService.showSuccess('SETTINGS.PROFILE.PASSWORD_CHANGED');
              this.passwordForm.reset();
          },
          error: (err) => {
              this.notificationService.showError('SETTINGS.PROFILE.ERRORS.PASSWORD_CHANGE_FAILED');
          }
      });
    }
  }
}
