import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map, Observable, of, tap } from 'rxjs';

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

  // Signal to hold the current configuration
  currentCountry = signal<CountryConfig | null>(null);

  getCountryConfig(code: string): Observable<CountryConfig> {
    const cached = this.currentCountry();
    if (cached && cached.code.toLowerCase() === code.toLowerCase()) {
      return of(cached);
    }

    return this.http.get<CountryConfig>(`${environment.apiUrl}/countries/${code}`).pipe(
      tap(config => this.currentCountry.set(config)),
      catchError(() => {
        // Fallback for verification when backend is down
        console.warn('Backend not reachable, using mock config');

        let mock: CountryConfig;

        if (code.toLowerCase() === 'do') {
            mock = {
                code: 'do',
                name: 'República Dominicana',
                currencyCode: 'DOP',
                currencySymbol: 'RD$',
                locale: 'es-DO',
                phoneCode: '+1',
                formSchema: {
                    taxId: {
                        label: 'RNC / Cédula',
                        pattern: '^[0-9]+$',
                        errorMessage: 'El RNC es inválido',
                        required: true
                    }
                }
            };
        } else if (code.toLowerCase() === 'co') {
             mock = {
                code: 'co',
                name: 'Colombia',
                currencyCode: 'COP',
                currencySymbol: '$',
                locale: 'es-CO',
                phoneCode: '+57',
                formSchema: {
                    taxId: {
                        label: 'NIT',
                        pattern: '^[0-9]+$',
                        errorMessage: 'El NIT es inválido',
                        required: true
                    }
                }
            };
        } else {
             // Default / US
             mock = {
                code: 'us',
                name: 'United States',
                currencyCode: 'USD',
                currencySymbol: '$',
                locale: 'en-US',
                phoneCode: '+1',
                formSchema: {
                    taxId: {
                        label: 'EIN / SSN',
                        pattern: '^[0-9]+$',
                        errorMessage: 'Invalid ID',
                        required: true
                    }
                }
            };
        }

        this.currentCountry.set(mock);
        return of(mock);
      })
    );
  }
}
