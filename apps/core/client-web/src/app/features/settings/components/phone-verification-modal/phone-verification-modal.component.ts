
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Phone, X, Check } from 'lucide-angular';
import { AuthService } from '../../../../core/services/auth';
import { NotificationService } from '../../../../core/services/notification';

@Component({
  selector: 'app-phone-verification-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, LucideAngularModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
         *ngIf="isOpen()"
         (click)="close.emit()">

      <div class="w-full max-w-md bg-white dark:bg-card-bg rounded-xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
           (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <lucide-icon [img]="PhoneIcon" class="w-5 h-5 text-primary-500"></lucide-icon>
            {{ 'SETTINGS.PROFILE.PHONE_VERIFICATION.TITLE' | translate }}
          </h3>
          <button (click)="close.emit()" class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
            <lucide-icon [img]="XIcon" class="w-5 h-5"></lucide-icon>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4">

          <!-- Step 1: Enter Phone -->
          <div *ngIf="!otpSent()" class="space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-300">
              {{ 'SETTINGS.PROFILE.PHONE_VERIFICATION.DESCRIPTION' | translate }}
            </p>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ 'SETTINGS.PROFILE.PHONE_NUMBER' | translate }}
              </label>
              <input type="tel"
                     [formControl]="phoneControl"
                     class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                     placeholder="+1234567890">
              <p *ngIf="phoneControl.invalid && phoneControl.touched" class="mt-1 text-xs text-red-500">
                {{ 'AUTH.ERRORS.INVALID_PHONE' | translate }}
              </p>
            </div>

            <button (click)="sendOtp()"
                    [disabled]="phoneControl.invalid || isLoading()"
                    class="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed">
              <span *ngIf="isLoading()" class="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              {{ 'SETTINGS.PROFILE.PHONE_VERIFICATION.SEND_CODE' | translate }}
            </button>
          </div>

          <!-- Step 2: Enter OTP -->
          <div *ngIf="otpSent()" class="space-y-4 animate-fadeIn">
            <p class="text-sm text-gray-600 dark:text-gray-300">
              {{ 'SETTINGS.PROFILE.PHONE_VERIFICATION.OTP_SENT_TO' | translate }}
              <span class="font-medium text-gray-900 dark:text-white">{{ phoneControl.value }}</span>
            </p>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ 'SETTINGS.PROFILE.PHONE_VERIFICATION.ENTER_CODE' | translate }}
              </label>
              <input type="text"
                     [formControl]="otpControl"
                     maxlength="6"
                     class="w-full px-4 py-2 text-center text-2xl tracking-widest rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                     placeholder="000000">
            </div>

            <button (click)="verifyOtp()"
                    [disabled]="otpControl.invalid || isLoading()"
                    class="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed">
              <span *ngIf="isLoading()" class="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              {{ 'SETTINGS.PROFILE.PHONE_VERIFICATION.VERIFY' | translate }}
            </button>

            <div class="text-center">
              <button (click)="otpSent.set(false)" class="text-xs text-primary-500 hover:text-primary-600">
                {{ 'SETTINGS.PROFILE.PHONE_VERIFICATION.WRONG_NUMBER' | translate }}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out forwards;
    }
  `]
})
export class PhoneVerificationModalComponent {
  @Input() isOpen = signal(false);
  @Output() close = new EventEmitter<void>();
  @Output() verified = new EventEmitter<void>();

  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  protected readonly PhoneIcon = Phone;
  protected readonly XIcon = X;
  protected readonly CheckIcon = Check;

  phoneControl = new FormControl('', [Validators.required]); // E.164 validation ideally
  otpControl = new FormControl('', [Validators.required, Validators.minLength(6)]);

  isLoading = signal(false);
  otpSent = signal(false);

  sendOtp() {
    if (this.phoneControl.invalid) return;
    this.isLoading.set(true);

    this.authService.sendPhoneOtp(this.phoneControl.value!).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.otpSent.set(true);
        this.notificationService.showSuccess('SETTINGS.PROFILE.OTP_SENT');
      },
      error: () => {
        this.isLoading.set(false);
        this.notificationService.showError('SETTINGS.PROFILE.ERRORS.OTP_SEND');
      }
    });
  }

  verifyOtp() {
    if (this.otpControl.invalid) return;
    this.isLoading.set(true);

    this.authService.verifyPhoneOtp(this.otpControl.value!, this.phoneControl.value!).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.notificationService.showSuccess('SETTINGS.PROFILE.PHONE_VERIFIED');
        this.verified.emit();
        this.close.emit();
      },
      error: () => {
        this.isLoading.set(false);
        this.notificationService.showError('SETTINGS.PROFILE.ERRORS.OTP_INVALID');
      }
    });
  }
}
