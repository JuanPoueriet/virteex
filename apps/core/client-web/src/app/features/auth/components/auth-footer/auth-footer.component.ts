import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-auth-footer',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterModule],
  template: `
    <footer class="w-full py-4 px-6 flex flex-col md:flex-row items-center justify-between text-sm text-text-tertiary gap-4 border-t border-white/5 bg-bg-primary/50 backdrop-blur-sm">
      <div class="flex items-center gap-4">
        <span>&copy; {{ currentYear }} FacturaPRO</span>
        <a routerLink="/contact" class="hover:text-primary transition-colors">{{ 'AUTH.CONTACT' | translate }}</a>
      </div>

      <div class="flex items-center gap-2">
        <button
          (click)="changeLang('es')"
          [class.text-primary]="currentLang === 'es'"
          class="hover:text-primary transition-colors font-medium">
          ES
        </button>
        <span class="text-white/20">|</span>
        <button
          (click)="changeLang('en')"
          [class.text-primary]="currentLang === 'en'"
          class="hover:text-primary transition-colors font-medium">
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
