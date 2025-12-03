import { TestBed } from '@angular/core/testing';
import { CountryGuard } from './country.guard';
import { CountryService } from '../services/country.service';
import { LanguageService } from '../services/language';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { of, throwError } from 'rxjs';

class MockCountryService {
  getCountryConfig = jest.fn().mockReturnValue(of({}));
}

class MockLanguageService {
  setLanguage = jest.fn();
}

class MockRouter {
  createUrlTree = jest.fn((commands) => commands.join('/'));
}

describe('CountryGuard', () => {
  let guard: CountryGuard;
  let countryService: MockCountryService;
  let languageService: MockLanguageService;
  let router: MockRouter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CountryGuard,
        { provide: CountryService, useClass: MockCountryService },
        { provide: LanguageService, useClass: MockLanguageService },
        { provide: Router, useClass: MockRouter }
      ]
    });

    guard = TestBed.inject(CountryGuard);
    countryService = TestBed.inject(CountryService) as unknown as MockCountryService;
    languageService = TestBed.inject(LanguageService) as unknown as MockLanguageService;
    router = TestBed.inject(Router) as unknown as MockRouter;
  });

  it('should allow navigation if country and lang are present and valid', (done) => {
    const route = {
      paramMap: {
        get: (key: string) => key === 'country' ? 'do' : 'es'
      }
    } as unknown as ActivatedRouteSnapshot;

    const obs = guard.canActivate(route, {} as RouterStateSnapshot);

    if (typeof obs === 'boolean' || obs instanceof Promise || 'urlTree' in (obs as any)) {
      fail('Expected observable');
      return;
    }

    (obs as any).subscribe((result: boolean) => {
      expect(result).toBe(true);
      expect(languageService.setLanguage).toHaveBeenCalledWith('es');
      expect(countryService.getCountryConfig).toHaveBeenCalledWith('do');
      done();
    });
  });

  it('should redirect if country fetch fails', (done) => {
    countryService.getCountryConfig.mockReturnValue(throwError(() => new Error('Failed')));
    const route = {
        paramMap: {
          get: (key: string) => key === 'country' ? 'invalid' : 'es'
        }
      } as unknown as ActivatedRouteSnapshot;

      const obs = guard.canActivate(route, {} as RouterStateSnapshot);

      (obs as any).subscribe((result: any) => {
        expect(router.createUrlTree).toHaveBeenCalled();
        done();
      });
  });
});
