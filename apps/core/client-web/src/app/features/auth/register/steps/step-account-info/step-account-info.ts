import { Component, Input, ChangeDetectionStrategy, signal, ChangeDetectorRef, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, User, Phone, CaseSensitive, Image, Mail, Lock, Eye, EyeOff, Check, X } from 'lucide-angular';

@Component({
  selector: 'app-step-account-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './step-account-info.html',
  styleUrls: ['./step-account-info.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StepAccountInfo implements OnInit, OnChanges {
  @Input() parentForm!: FormGroup;

  // Iconos para la plantilla
  protected readonly UserIcon = User;
  protected readonly PhoneIcon = Phone;
  protected readonly JobIcon = CaseSensitive;
  protected readonly AvatarIcon = Image;
  protected readonly MailIcon = Mail;
  protected readonly LockIcon = Lock;
  protected readonly EyeIcon = Eye;
  protected readonly EyeOffIcon = EyeOff;
  protected readonly CheckIcon = Check;
  protected readonly XIcon = X;

  avatarPreview = signal<string | ArrayBuffer | null>(null);
  showPassword = false;
  showConfirmPassword = false;
  showPasswordHints = false;

  private cdRef = inject(ChangeDetectorRef);
  private passwordChangesSubscription: any;

  ngOnInit() {
    this.setupPasswordListener();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['parentForm']) {
      this.setupPasswordListener();
    }
  }

  private setupPasswordListener() {
    if (this.passwordChangesSubscription) {
      this.passwordChangesSubscription.unsubscribe();
    }
    
    const passwordControl = this.passwordGroup?.get('password');
    
    if (passwordControl) {
      this.passwordChangesSubscription = passwordControl.valueChanges.subscribe(() => {
        this.cdRef.detectChanges();
      });
    }
  }

  get passwordGroup(): FormGroup | null {
    try {
      return this.parentForm?.get?.('passwordGroup') as FormGroup;
    } catch {
      return null;
    }
  }

  get passwordValue(): string {
    return this.passwordGroup?.get?.('password')?.value || '';
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.parentForm.patchValue({ avatarUrl: file });
      const reader = new FileReader();
      reader.onload = () => this.avatarPreview.set(reader.result);
      reader.readAsDataURL(file);
    }
  }
  
  hasUpperCase(value: string): boolean {
    return /[A-Z]/.test(value);
  }
  hasLowerCase(value: string): boolean {
    return /[a-z]/.test(value);
  }

  hasNumber(value: string): boolean {
    return /[0-9]/.test(value);
  }

  hasSpecialChar(value: string): boolean {
    return /[!@#$%^&*(),.?":{}|<>]/.test(value);
  }

  onPasswordBlur() {
    if (!document.activeElement?.id.includes('confirmPassword')) {
      setTimeout(() => {
        this.showPasswordHints = false;
        this.cdRef.detectChanges();
      }, 200);
    }
  }
}