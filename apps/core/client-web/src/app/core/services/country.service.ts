import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, Observable, of, tap } from 'rxjs';
import { GeoLocationService } from './geo-location.service';

export interface CountryConfig {
  code: string;
  name: string;
  currencyCode: string;
  currencySymbol: string;
  locale: string;
  phoneCode: string;
  taxIdLabel: string;
  taxIdRegex: string;
  taxIdMask: string;
  fiscalRegionId?: string; // UUID of the fiscal region
  formSchema: any;
}

@Injectable({
  providedIn: 'root'
})
export class CountryService {
  private http = inject(HttpClient);
  private geoLocation = inject(GeoLocationService);

  // Signal que mantiene la configuración actual
  currentCountry = signal<CountryConfig | null>(null);
  
  // Computed para obtener solo el código de manera segura (fallback a 'do' si aún carga)
  currentCountryCode = computed(() => this.currentCountry()?.code.toLowerCase() || 'do');

  /**
   * Detecta el país desde el backend y actualiza la señal.
   * Debe llamarse al iniciar componentes críticos como el Login.
   */
  detectAndSetCountry(): void {
    this.geoLocation.getGeoLocation().subscribe((res) => {
      if (res.country) {
        // Obtenemos la configuración completa basada en el código detectado por el backend
        this.getCountryConfig(res.country).subscribe();
      }
    });
  }

  getCountryConfig(code: string): Observable<CountryConfig> {
    const cached = this.currentCountry();
    // Si ya tenemos ese país cargado, no hacemos fetch
    if (cached && cached.code.toLowerCase() === code.toLowerCase()) {
      return of(cached);
    }

    return this.http.get<CountryConfig>(`${environment.apiUrl}/localization/config/${code}`).pipe(
      tap(config => {
        // Map backend response
        const mappedConfig: CountryConfig = {
           code: config['countryCode'] || code,
           name: config['name'] || code,
           currencyCode: config['currency'] || 'USD',
           currencySymbol: '$',
           locale: 'es-DO',
           phoneCode: '+1',
           taxIdLabel: config['taxIdLabel'] || 'Tax ID',
           taxIdRegex: config['taxIdRegex'] || '.*',
           taxIdMask: config['taxIdMask'] || '',
           fiscalRegionId: config['fiscalRegionId'], // Backend must return this!
           formSchema: {}
        };
        this.currentCountry.set(mappedConfig);
      }),
      catchError(() => {
        console.warn('Backend inalcanzable, usando mock local para:', code);
        
        // Mock básico para fallback
        let mock: CountryConfig = {
            code: 'do',
            name: 'República Dominicana',
            currencyCode: 'DOP',
            currencySymbol: 'RD$',
            locale: 'es-DO',
            phoneCode: '+1',
            taxIdLabel: 'RNC',
            taxIdRegex: '^\\d{9,11}$',
            taxIdMask: '000-00000-0',
            fiscalRegionId: undefined, // Cannot mock valid UUID easily without DB
            formSchema: {}
        };

        if (code.toLowerCase() === 'co') {
             mock = { ...mock, code: 'co', name: 'Colombia', currencyCode: 'COP', currencySymbol: '$', phoneCode: '+57', taxIdLabel: 'NIT' };
        } else if (code.toLowerCase() === 'us') {
             mock = { ...mock, code: 'us', name: 'United States', currencyCode: 'USD', currencySymbol: '$', phoneCode: '+1', locale: 'en-US', taxIdLabel: 'EIN' };
        }

        this.currentCountry.set(mock);
        return of(mock);
      })
    );
  }

  // Helper to fetch details for tax ID
  lookupTaxId(taxId: string, countryCode: string): Observable<any> {
      return this.http.get<any>(`${environment.apiUrl}/localization/lookup/${taxId}?country=${countryCode}`);
  }
}
