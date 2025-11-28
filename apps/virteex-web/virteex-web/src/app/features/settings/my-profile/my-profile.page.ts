import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
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
  User,
  Mail,
  Phone,
  Building2,
  Save,
  Image,
} from 'lucide-angular';
import { AuthService } from '../../../core/services/auth';
import { NotificationService } from '../../../core/services/notification';

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
  private notificationService = inject(NotificationService);

  // Icons
  protected readonly UserIcon = User;
  protected readonly MailIcon = Mail;
  protected readonly PhoneIcon = Phone;
  protected readonly CompanyIcon = Building2;
  protected readonly SaveIcon = Save;
  protected readonly ImageIcon = Image;

  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  avatarPreview = signal<string | ArrayBuffer | null>(null);

  currentUser = this.authService.currentUser;

  ngOnInit(): void {
    const user = this.currentUser();

    this.profileForm = this.fb.group({
      firstName: [user?.firstName, Validators.required],
      lastName: [user?.lastName, Validators.required],
      email: [{ value: user?.email, disabled: true }],
    //   phone: [user?.phone || ''],
    //   jobTitle: [user?.jobTitle || ''],
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
      reader.onload = () => this.avatarPreview.set(reader.result);
      reader.readAsDataURL(file);
      this.profileForm.markAsDirty();
    }
  }

  saveProfile(): void {
    if (this.profileForm.valid) {
      console.log('Profile updated:', this.profileForm.value);
      this.notificationService.showSuccess('Perfil actualizado exitosamente.');
      this.profileForm.markAsPristine();
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
      console.log('Password change requested:', this.passwordForm.value);
      this.notificationService.showSuccess(
        'Contraseña actualizada exitosamente.'
      );
      this.passwordForm.reset();
    }
  }
}
