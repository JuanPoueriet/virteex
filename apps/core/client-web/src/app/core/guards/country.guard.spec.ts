import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CountryGuard } from './country.guard';
import { CountryService } from '../services/country.service';
import { LanguageService } from '../services/language';

describe('CountryGuard', () => {
  let guard: CountryGuard;
  let countryServiceMock: any;
  let languageServiceMock: any;
  let router: Router;

  beforeEach(() => {
    countryServiceMock = {
      getCountryConfig: jest.fn().mockReturnValue(of({ code: 'DO' }))
    };
    languageServiceMock = {
      setLanguage: jest.fn()
    };

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        CountryGuard,
        { provide: CountryService, useValue: countryServiceMock },
        { provide: LanguageService, useValue: languageServiceMock }
      ]
    });

    guard = TestBed.inject(CountryGuard);
    router = TestBed.inject(Router);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should redirect to default if params are missing', () => {
    const route = new ActivatedRouteSnapshot();
    route.params = {};
    const state = {} as RouterStateSnapshot;
    const routerSpy = jest.spyOn(router, 'createUrlTree');

    guard.canActivate(route, state);

    expect(routerSpy).toHaveBeenCalledWith(['/es/do/auth/register']);
  });

  it('should set language and fetch config when params exist', (done) => {
    const route = new ActivatedRouteSnapshot();
    route.params = { country: 'do', lang: 'es' };
    const state = {} as RouterStateSnapshot;

    (guard.canActivate(route, state) as any).subscribe((result: boolean) => {
      expect(result).toBe(true);
      expect(languageServiceMock.setLanguage).toHaveBeenCalledWith('es');
      expect(countryServiceMock.getCountryConfig).toHaveBeenCalledWith('do');
      done();
    });
  });

  it('should redirect if country config fetch fails', (done) => {
    const route = new ActivatedRouteSnapshot();
    route.params = { country: 'xx', lang: 'es' };
    const state = {} as RouterStateSnapshot;

    countryServiceMock.getCountryConfig.mockReturnValue(throwError(() => new Error('Not found')));
    const routerSpy = jest.spyOn(router, 'createUrlTree');

    (guard.canActivate(route, state) as any).subscribe((result: any) => {
      expect(routerSpy).toHaveBeenCalledWith(['/do/es/auth/login']);
      done();
    });
  });
});
