import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, catchError, Observable, timer, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GeoLocationResponse {
  country: string | null;
  ip: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeoLocationService {
  private http = inject(HttpClient);

  // SIGNAL FOR MODAL STATE
  // This signal allows any component (like the modal itself) to know if there is a mismatch
  mismatchSignal = signal<{ detected: string, current: string } | null>(null);

  // DEBUG / SIMULATION
  // Set to null to strictly use backend source of truth
  private readonly SIMULATE_COUNTRY_CODE: string | null = null;

  /**
   * Fetches the real location from the backend.
   * Applies simulation override if set (for dev purposes only).
   */
  getGeoLocation(): Observable<GeoLocationResponse> {
    if (this.SIMULATE_COUNTRY_CODE) {
      return of({ country: this.SIMULATE_COUNTRY_CODE, ip: '0.0.0.0 (simulated)' });
    }

    // Backend endpoint
    return this.http.get<GeoLocationResponse>(`${environment.apiUrl}/geo/location`).pipe(
        catchError(() => {
            return of({ country: null, ip: '' });
        })
    );
  }

  /**
   * Detects location and compares it with the current route country.
   * If mismatch, updates the signal after a delay to ensure UI is rendered.
   */
  checkAndNotifyMismatch(routeCountryCode: string) {
    // If routeCountryCode is empty or invalid, ignore
    if (!routeCountryCode) return;

    // We add a delay to ensure the page has rendered fully and the user experience is smooth.
    timer(2000).pipe(
        switchMap(() => this.getGeoLocation())
    ).subscribe(response => {
      const detected = response.country;

      if (detected && routeCountryCode.toLowerCase() !== detected.toLowerCase()) {
        // Update the signal so the modal can open
        this.mismatchSignal.set({
            detected: detected.toUpperCase(),
            current: routeCountryCode.toUpperCase()
        });
      } else {
        this.mismatchSignal.set(null);
      }
    });
  }
}
