import { Component, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { GeoLocationService } from '../../../core/services/geo-location.service';
import { CountryService } from '../../../core/services/country.service';

@Component({
  selector: 'app-geo-mismatch-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="geoService.mismatchSignal(); as mismatch" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
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
  geoService = inject(GeoLocationService);
  private router = inject(Router);
  private document = inject(DOCUMENT);
  private countryService = inject(CountryService);

  // Helper to map codes to names using the existing CountryService if possible
  // Falls back to code if name not found
  getCountryName(code: string): string {
    // Try to find the country in the CountryService's loaded config or a known list if available.
    // Since CountryService usually holds the *current* country config, it might not have the list of *all* countries loaded in memory depending on implementation.
    // However, usually there is a list of supported countries.
    // For now, we will try to see if CountryService has a list, otherwise fallback to the code or a simple display.

    // Assuming countryService might not expose a full list directly in this context without an API call.
    // But commonly, `countryService` might have a list of supported locales.
    // If not, we fall back to the code, which is acceptable, or use the Intl.DisplayNames API.

    try {
        const regionNames = new Intl.DisplayNames(['es'], { type: 'region' });
        return regionNames.of(code.toUpperCase()) || code.toUpperCase();
    } catch (e) {
        return code.toUpperCase();
    }
  }

  close() {
    this.geoService.mismatchSignal.set(null);
  }

  switchCountry(newCountryCode: string) {
    const url = this.router.url;
    const segments = url.split('/');

    const current = this.geoService.mismatchSignal()?.current.toLowerCase();

    if (current) {
        const index = segments.findIndex(s => s.toLowerCase() === current);
        if (index !== -1) {
            segments[index] = newCountryCode.toLowerCase();
            const newUrl = segments.join('/');
            this.document.location.href = newUrl;
        }
    }
    this.close();
  }
}
