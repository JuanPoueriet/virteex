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
} from 'lucide-angular';
import { AuthService } from '../../../core/services/auth';
import { NotificationService } from '../../../core/services/notification';
import { UsersService } from '../../../core/api/users.service';

@Component({
  selector: 'app-my-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
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

  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  avatarPreview = signal<string | ArrayBuffer | null>(null);

  currentUser = this.authService.currentUser;
  isLoading = false;

  ngOnInit(): void {
    const user = this.currentUser();

    this.profileForm = this.fb.group({
      firstName: [user?.firstName, Validators.required],
      lastName: [user?.lastName, Validators.required],
      email: [{ value: user?.email, disabled: true }],
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
      const reader = new FileReader();
      reader.onload = () => {
         this.avatarPreview.set(reader.result);
         this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
      this.profileForm.markAsDirty();
      // Here you would upload the file immediately or wait for save
      // For now, we just preview.
    }
  }

  saveProfile(): void {
    if (this.profileForm.valid) {
      this.isLoading = true;
      const { firstName, lastName, preferredLanguage } = this.profileForm.value;

      this.usersService.updateProfile({ firstName, lastName, preferredLanguage }).subscribe({
        next: (updatedUser) => {
          this.notificationService.showSuccess('Perfil actualizado exitosamente.');
          // Update local state if needed via AuthService
          // this.authService.updateCurrentUser(updatedUser);
          this.profileForm.markAsPristine();
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error(err);
          this.notificationService.showError('Error al actualizar el perfil.');
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
        this.notificationService.showError(
          'Las nuevas contraseñas no coinciden.'
        );
        return;
      }
      // Implement password change logic calling AuthService or UsersService
      console.log('Password change requested:', this.passwordForm.value);
      // Mock success for now as the endpoint might be missing in this exact context or handled by Auth
      this.notificationService.showSuccess(
        'Contraseña actualizada exitosamente (Simulado).'
      );
      this.passwordForm.reset();
    }
  }
}
