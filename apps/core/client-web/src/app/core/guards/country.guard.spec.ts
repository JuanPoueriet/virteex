import { TestBed } from '@angular/core/testing';
import { CountryGuard } from './country.guard';
import { CountryService } from '../services/country.service';
import { LanguageService } from '../services/language';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GeoLocationService } from '../services/geo-location.service';

class MockCountryService {
  getCountryConfig = jest.fn().mockReturnValue(of({ code: 'do' }));
}

class MockLanguageService {
  setLanguage = jest.fn();
}

class MockRouter {
  createUrlTree = jest.fn((commands) => commands.join('/'));
  parseUrl = jest.fn((url) => url);
}

class MockGeoLocationService {
  checkAndNotifyMismatch = jest.fn();
}

describe('CountryGuard', () => {
  let guard: CountryGuard;
  let countryService: MockCountryService;
  let languageService: MockLanguageService;
  let router: MockRouter;
  let geoService: MockGeoLocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CountryGuard,
        { provide: CountryService, useClass: MockCountryService },
        { provide: LanguageService, useClass: MockLanguageService },
        { provide: Router, useClass: MockRouter },
        { provide: GeoLocationService, useClass: MockGeoLocationService },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    guard = TestBed.inject(CountryGuard);
    countryService = TestBed.inject(CountryService) as unknown as MockCountryService;
    languageService = TestBed.inject(LanguageService) as unknown as MockLanguageService;
    router = TestBed.inject(Router) as unknown as MockRouter;
    geoService = TestBed.inject(GeoLocationService) as unknown as MockGeoLocationService;
  });

  it('should allow navigation if country and lang are present and valid', (done) => {
    const route = {
      paramMap: {
        get: (key: string) => key === 'country' ? 'do' : 'es'
      }
    } as unknown as ActivatedRouteSnapshot;

    const state = { url: '/es/do/home' } as RouterStateSnapshot;

    countryService.getCountryConfig.mockReturnValue(of({ code: 'do' }));

    const obs = guard.canActivate(route, state);

    if (typeof obs === 'boolean' || obs instanceof Promise || 'urlTree' in (obs as any)) {
      fail('Expected observable');
      done();
      return;
    }

    (obs as any).subscribe({
      next: (result: boolean) => {
        expect(result).toBe(true);
        expect(languageService.setLanguage).toHaveBeenCalledWith('es');
        expect(countryService.getCountryConfig).toHaveBeenCalledWith('do');
        expect(geoService.checkAndNotifyMismatch).toHaveBeenCalledWith('do');
        done();
      },
      error: (err: any) => {
        fail('Should not error: ' + err);
        done();
      }
    });
  });

  it('should redirect if country fetch fails', (done) => {
    countryService.getCountryConfig.mockReturnValue(throwError(() => new Error('Failed')));
    const route = {
        paramMap: {
          get: (key: string) => key === 'country' ? 'invalid' : 'es'
        }
      } as unknown as ActivatedRouteSnapshot;

      const state = { url: '/es/invalid/home' } as RouterStateSnapshot;

      const obs = guard.canActivate(route, state);

      (obs as any).subscribe((result: any) => {
        expect(router.parseUrl).toHaveBeenCalledWith('/es/do/home');
        done();
      });
  });
});
