import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { CountryService } from '../../../core/services/country.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-geo-mismatch-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800">
        <h2 class="text-xl font-bold mb-4 text-slate-900 dark:text-white">
          Ubicación Detectada
        </h2>
        <p class="mb-6 text-slate-600 dark:text-slate-400">
          Parece que estás en <strong>{{ detectedCountryName() }}</strong>, pero estás viendo la versión de <strong>{{ currentCountryName() }}</strong>.
          <br><br>
          ¿Quieres cambiar a la versión de {{ detectedCountryName() }}?
        </p>
        <div class="flex justify-end gap-3">
          <button (click)="close()" class="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
            Continuar en {{ currentCountryName() }}
          </button>
          <button (click)="switchCountry()" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
            Cambiar a {{ detectedCountryName() }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class GeoMismatchModalComponent implements OnInit {
  isOpen = signal(false);
  detectedCountryCode = signal<string>('');
  detectedCountryName = signal<string>('');
  currentCountryName = signal<string>('');

  constructor(
    private countryService: CountryService,
    private router: Router,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit() {
    this.checkGeoLocation();
  }

  async checkGeoLocation() {
    // Mock Geo Location logic
    // In a real scenario, we would call an IP Geolocation API here.
    // For this demo, we check if a 'simulated_geo' is set in localStorage,
    // otherwise we assume the user is where the URL says they are to avoid annoying popups.

    const simulatedGeo = localStorage.getItem('simulated_geo_code');
    if (!simulatedGeo) return; // Assume match if not simulated

    const mockDetectedCode = simulatedGeo;
    const mockDetectedName = simulatedGeo === 'CO' ? 'Colombia' : (simulatedGeo === 'DO' ? 'República Dominicana' : 'United States');

    const currentConfig = this.countryService.currentCountry();
    if (!currentConfig) return;

    if (currentConfig.code.toLowerCase() !== mockDetectedCode.toLowerCase()) {
      // Mismatch!
      this.detectedCountryCode.set(mockDetectedCode);
      this.detectedCountryName.set(mockDetectedName);
      this.currentCountryName.set(currentConfig.name);

      // Only show if we haven't dismissed it (could use localStorage)
      this.isOpen.set(true);
    }
  }

  close() {
    this.isOpen.set(false);
  }

  switchCountry() {
    // Construct new URL
    // Current: /do/es/auth/register
    // New: /co/es/auth/register (keeping language 'es' for now)

    const url = this.router.url;
    const segments = url.split('/');
    // segments[0] is empty, [1] is country, [2] is lang
    if (segments.length >= 3) {
      segments[1] = this.detectedCountryCode().toLowerCase();
      const newUrl = segments.join('/');

      // Force reload to ensure guards run fresh
      this.document.location.href = newUrl;
    }
    this.close();
  }
}
