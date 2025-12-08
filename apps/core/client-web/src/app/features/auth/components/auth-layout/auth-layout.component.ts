import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthFooterComponent } from '../auth-footer/auth-footer.component';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, AuthFooterComponent],
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss']
})
export class AuthLayoutComponent {
  isLangDropdownOpen = false;
  availableLanguages = [
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'en', label: 'English', flag: '🇺🇸' }
  ];

  constructor(private translate: TranslateService) {}

  get currentLang(): string {
    return this.translate.currentLang || 'es';
  }

  get currentLangLabel(): string {
    const lang = this.availableLanguages.find(l => l.code === this.currentLang);
    return lang ? lang.label : 'Español';
  }

  toggleLangDropdown(event: Event) {
    event.stopPropagation();
    this.isLangDropdownOpen = !this.isLangDropdownOpen;
  }

  changeLang(langCode: string) {
    this.translate.use(langCode);
    localStorage.setItem('lang', langCode);
    this.isLangDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Close dropdown when clicking outside
    const target = event.target as HTMLElement;
    if (!target.closest('.language-selector')) {
      this.isLangDropdownOpen = false;
    }
  }
}
