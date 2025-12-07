
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Key } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-social-login',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslateModule],
  templateUrl: './social-login.component.html',
  styleUrls: ['./social-login.component.scss']
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
