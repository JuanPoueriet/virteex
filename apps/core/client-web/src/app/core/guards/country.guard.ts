import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { CountryService } from '../services/country.service';
import { LanguageService } from '../services/language';

@Injectable({
  providedIn: 'root'
})
export class CountryGuard implements CanActivate {
  private countryService = inject(CountryService);
  private languageService = inject(LanguageService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | boolean | UrlTree {
    const countryCode = route.paramMap.get('country');
    const langCode = route.paramMap.get('lang');

    // Default fallback
    const fallbackUrl = ['/es/do/auth/register']; // Or login depending on context, but this guard is mostly for register now

    // Basic validation
    if (!countryCode || !langCode) {
       return this.router.createUrlTree(fallbackUrl);
    }

    // Set language
    this.languageService.setLanguage(langCode);

    // Fetch Country Config
    return this.countryService.getCountryConfig(countryCode).pipe(
      map(() => true),
      catchError(() => {
        // If country not found, redirect to a valid path
        // We can keep the language if it's valid, but safe to fallback to default
        // Construct a safe URL. If lang is valid, use it?
        // Let's force default for robustness as requested
        return of(this.router.createUrlTree(['/', langCode, 'do', 'auth', 'register']));
      })
    );
  }
}
