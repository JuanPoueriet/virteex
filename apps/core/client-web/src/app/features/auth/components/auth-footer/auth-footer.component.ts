
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Globe } from 'lucide-angular';
import { LanguageService } from '../../../../core/services/language';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-auth-footer',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule, RouterModule],
  template: `
    <footer class="w-full py-4 px-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 bg-white/50 backdrop-blur-md border-t border-gray-100/50 absolute bottom-0 left-0 right-0 z-10">
      <div class="flex items-center space-x-4 mb-2 md:mb-0">
        <span class="opacity-70">{{ 'LOGIN.FOOTER.COPYRIGHT' | translate }}</span>
      </div>

      <div class="flex items-center space-x-6">
        <!-- Language Selector (Discrete) -->
        <div class="relative group cursor-pointer flex items-center hover:text-primary transition-colors duration-200">
           <lucide-icon [img]="GlobeIcon" class="w-3 h-3 mr-1"></lucide-icon>
           <span class="uppercase font-medium tracking-wide">{{ currentLang }}</span>

           <!-- Dropup Menu -->
           <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-white shadow-lg rounded-lg py-1 min-w-[80px] border border-gray-100">
              <button (click)="changeLang('es')" class="w-full text-center px-3 py-1 hover:bg-gray-50 text-xs block" [class.font-bold]="currentLang === 'es'">ES</button>
              <button (click)="changeLang('en')" class="w-full text-center px-3 py-1 hover:bg-gray-50 text-xs block" [class.font-bold]="currentLang === 'en'">EN</button>
           </div>
        </div>

        <a routerLink="/privacy" class="hover:text-primary transition-colors duration-200">{{ 'LOGIN.FOOTER.PRIVACY' | translate }}</a>
        <a routerLink="/terms" class="hover:text-primary transition-colors duration-200">{{ 'LOGIN.FOOTER.TERMS' | translate }}</a>
        <a routerLink="/contact" class="hover:text-primary transition-colors duration-200">{{ 'LOGIN.FOOTER.CONTACT' | translate }}</a>
      </div>
    </footer>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AuthFooterComponent {
  GlobeIcon = Globe;

  constructor(public languageService: LanguageService) {}

  get currentLang(): string {
    return this.languageService.currentLang();
  }

  changeLang(lang: string) {
    this.languageService.setLanguage(lang);
  }
}
