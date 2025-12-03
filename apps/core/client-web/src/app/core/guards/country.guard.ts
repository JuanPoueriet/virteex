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

    // Basic validation
    if (!countryCode || !langCode) {
       // Should probably redirect to a default or detect IP
       // For now, redirect to /do/es/login if missing
       return this.router.createUrlTree(['/do/es/auth/login']);
    }

    // Set language
    this.languageService.setLanguage(langCode);

    // Fetch Country Config
    return this.countryService.getCountryConfig(countryCode).pipe(
      map(() => true),
      catchError(() => {
        // If country not found, redirect to default or 404
        return of(this.router.createUrlTree(['/do/es/auth/login']));
      })
    );
  }
}
