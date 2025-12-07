
import { Component, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Globe } from 'lucide-angular';
import { LanguageService } from '../../../../core/services/language';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-auth-footer',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule, RouterModule],
  templateUrl: './auth-footer.component.html',
  styleUrls: ['./auth-footer.component.scss']
})
export class AuthFooterComponent {
  GlobeIcon = Globe;
  isOpen = false;

  constructor(
    public languageService: LanguageService,
    private elementRef: ElementRef
  ) {}

  get currentLang(): string {
    return this.languageService.currentLang();
  }

  changeLang(lang: string) {
    this.languageService.setLanguage(lang);
    this.isOpen = false;
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }
}
