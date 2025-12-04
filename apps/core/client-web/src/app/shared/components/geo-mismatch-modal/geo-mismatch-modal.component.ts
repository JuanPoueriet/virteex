import { Component, Inject, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { GeoLocationService } from '../../../core/services/geo-location.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-geo-mismatch-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="geoLocationService.mismatchSignal(); let mismatch" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800">
        <h2 class="text-xl font-bold mb-4 text-slate-900 dark:text-white">
          Ubicación Detectada
        </h2>
        <p class="mb-6 text-slate-600 dark:text-slate-400">
          Parece que estás en <strong>{{ getCountryName(mismatch.detected) }}</strong>, pero estás viendo la versión de <strong>{{ getCountryName(mismatch.current) }}</strong>.
          <br><br>
          ¿Quieres cambiar a la versión de {{ getCountryName(mismatch.detected) }}?
        </p>
        <div class="flex justify-end gap-3">
          <button (click)="close()" class="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
            Continuar en {{ getCountryName(mismatch.current) }}
          </button>
          <button (click)="switchCountry(mismatch.detected)" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
            Cambiar a {{ getCountryName(mismatch.detected) }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class GeoMismatchModalComponent {
  public geoLocationService = inject(GeoLocationService);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  // Helper map for display names (simplified)
  // Ideally this should come from a service or i18n
  getCountryName(code: string): string {
    const map: Record<string, string> = {
      'DO': 'República Dominicana',
      'CO': 'Colombia',
      'US': 'United States',
      'ES': 'España',
      'MX': 'México'
    };
    return map[code.toUpperCase()] || code;
  }

  close() {
    this.geoLocationService.mismatchSignal.set(null);
  }

  switchCountry(targetCountryCode: string) {
    // Construct new URL
    // Current: /do/es/auth/register
    // New: /co/es/auth/register (keeping language 'es' for now)

    const url = this.router.url;
    const segments = url.split('/');
    // segments[0] is empty, [1] is language (usually), NO wait.
    // The route structure is often `/:lang/:country/...` or `/:lang/...`.
    // Let's look at `CountryGuard`. It checks `paramMap.get('country')`.
    // If we are here, we are likely in a route with country param.

    // However, segments array from `router.url` depends on the actual string.
    // Example: /es/do/auth/register -> ['', 'es', 'do', 'auth', 'register']
    // So index 2 is country.

    // But verify the segments structure.
    // In `CountryGuard`: `segments[2] = config.code.toLowerCase();`
    // So yes, index 2 seems to be the country slot in the URL convention used there.

    if (segments.length > 2) {
      segments[2] = targetCountryCode.toLowerCase();
      const newUrl = segments.join('/');

      // Force reload to ensure guards run fresh
      this.document.location.href = newUrl;
    }
    this.close();
  }
}
