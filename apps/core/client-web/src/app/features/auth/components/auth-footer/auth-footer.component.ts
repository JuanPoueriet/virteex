import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-auth-footer',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterModule],
  template: `
    <footer class="auth-footer">
      <div class="footer-left">
        <span>&copy; {{ currentYear }} FacturaPRO</span>
        <a routerLink="/contact" class="footer-link">{{ 'AUTH.CONTACT' | translate }}</a>
      </div>

      <div class="footer-right">
        <button
          (click)="changeLang('es')"
          [class.active]="currentLang === 'es'"
          class="lang-btn">
          ES
        </button>
        <span class="divider">|</span>
        <button
          (click)="changeLang('en')"
          [class.active]="currentLang === 'en'"
          class="lang-btn">
          EN
        </button>
      </div>
    </footer>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .auth-footer {
      width: 100%;
      padding: 1rem 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      font-size: 0.875rem; /* 14px */
      color: var(--text-tertiary);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      background-color: rgba(var(--bg-primary-rgb), 0.5);
      backdrop-filter: blur(4px);

      @media (min-width: 768px) {
        flex-direction: row;
      }
    }

    .footer-left, .footer-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .footer-link {
      color: var(--text-tertiary);
      text-decoration: none;
      transition: color 0.2s;

      &:hover {
        color: var(--primary);
      }
    }

    .lang-btn {
      background: none;
      border: none;
      padding: 0;
      color: var(--text-tertiary);
      font-weight: 500;
      cursor: pointer;
      transition: color 0.2s;

      &:hover {
        color: var(--primary);
      }

      &.active {
        color: var(--primary);
      }
    }

    .divider {
      color: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class AuthFooterComponent {
  currentYear = new Date().getFullYear();

  constructor(private translate: TranslateService) {}

  get currentLang(): string {
    return this.translate.currentLang;
  }

  changeLang(lang: string) {
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }
}
