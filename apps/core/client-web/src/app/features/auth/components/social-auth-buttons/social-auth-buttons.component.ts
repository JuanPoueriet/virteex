import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-social-auth-buttons',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="social-auth-container">
      <div class="divider">
        <div class="divider-line"></div>
        <div class="divider-text">
          <span>{{ 'LOGIN.OR' | translate }}</span>
        </div>
      </div>

      <div class="buttons-grid">
        <!-- Google -->
        <button (click)="loginWith('google')" class="social-btn" title="Google">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.09-.19-.75z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        </button>

        <!-- Microsoft -->
        <button (click)="loginWith('microsoft')" class="social-btn" title="Microsoft">
          <svg width="20" height="20" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#00a4ef" d="M12 1h10v10H12z"/><path fill="#7fba00" d="M1 12h10v10H1z"/><path fill="#ffb900" d="M12 12h10v10H12z"/></svg>
        </button>

        <!-- Okta -->
        <button (click)="loginWith('okta')" class="social-btn" title="Okta">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm0 18c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"/></svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .social-auth-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .divider {
      position: relative;
      padding: 0.5rem 0;
    }

    .divider-line {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
    }

    .divider-line::before {
      content: '';
      width: 100%;
      border-top: 1px solid var(--border-color);
      opacity: 0.5;
    }

    .divider-text {
      position: relative;
      display: flex;
      justify-content: center;
      text-transform: uppercase;
      font-size: 0.75rem;
    }

    .divider-text span {
      background-color: var(--bg-card); /* Should match card bg */
      padding: 0 0.5rem;
      color: var(--text-tertiary);
    }

    .buttons-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .social-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 44px;
      border-radius: 0.75rem; /* 12px */
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      transition: all 0.2s ease;
      color: var(--text-primary);
      cursor: pointer;

      &:hover {
        background: var(--bg-hover);
        border-color: var(--primary-light);
        transform: translateY(-1px);
        box-shadow: var(--shadow-sm);
      }

      &:active {
        transform: translateY(0);
      }
    }
  `]
})
export class SocialAuthButtonsComponent {
  @Output() onLogin = new EventEmitter<string>();

  loginWith(provider: string) {
    this.onLogin.emit(provider);
  }
}
