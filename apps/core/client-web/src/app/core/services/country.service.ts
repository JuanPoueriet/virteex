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

    return this.http.get<CountryConfig>(`${environment.apiUrl}/countries/${code}`).pipe(
      tap(config => this.currentCountry.set(config)),
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
            formSchema: {}
        };

        if (code.toLowerCase() === 'co') {
             mock = { ...mock, code: 'co', name: 'Colombia', currencyCode: 'COP', currencySymbol: '$', phoneCode: '+57' };
        } else if (code.toLowerCase() === 'us') {
             mock = { ...mock, code: 'us', name: 'United States', currencyCode: 'USD', currencySymbol: '$', phoneCode: '+1', locale: 'en-US' };
        }

        this.currentCountry.set(mock);
        return of(mock);
      })
    );
  }
}