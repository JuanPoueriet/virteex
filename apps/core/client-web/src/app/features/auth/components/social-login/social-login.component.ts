
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Key } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-social-login',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslateModule],
  template: `
    <div class="mt-6">
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-200"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-white text-gray-500">{{ 'LOGIN.OR' | translate }}</span>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-4 gap-3">
        <!-- Google -->
        <button
          type="button"
          (click)="onSocialLogin('google')"
          class="w-full flex justify-center items-center py-2.5 px-4 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 transition-all duration-200"
          title="Google"
        >
          <img class="h-5 w-5" src="assets/icons/google.svg" alt="Google">
        </button>

        <!-- Microsoft -->
        <button
          type="button"
          (click)="onSocialLogin('microsoft')"
          class="w-full flex justify-center items-center py-2.5 px-4 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 transition-all duration-200"
          title="Microsoft"
        >
          <img class="h-5 w-5" src="assets/icons/microsoft.svg" alt="Microsoft">
        </button>

        <!-- Okta -->
        <button
          type="button"
          (click)="onSocialLogin('okta')"
          class="w-full flex justify-center items-center py-2.5 px-4 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 transition-all duration-200"
          title="Okta"
        >
          <img class="h-5 w-5" src="assets/icons/okta.svg" alt="Okta">
        </button>

        <!-- Passkey -->
        <button
          type="button"
          (click)="onPasskeyLogin()"
          class="w-full flex justify-center items-center py-2.5 px-4 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 transition-all duration-200"
          title="Passkey"
        >
          <lucide-icon [img]="KeyIcon" class="h-5 w-5 text-gray-600"></lucide-icon>
        </button>
      </div>
    </div>
  `
})
export class SocialLoginComponent {
  @Output() socialLogin = new EventEmitter<string>();
  @Output() passkeyLogin = new EventEmitter<void>();

  KeyIcon = Key;

  onSocialLogin(provider: string) {
    this.socialLogin.emit(provider);
  }

  onPasskeyLogin() {
    this.passkeyLogin.emit();
  }
}
