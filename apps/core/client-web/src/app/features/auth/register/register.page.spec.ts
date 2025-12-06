
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterPage } from './register.page';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../../core/services/auth';
import { ReCaptchaV3Service } from 'ng-recaptcha-19';
import { of } from 'rxjs';
import { CountryService } from '../../../core/services/country.service';
import { LanguageService } from '../../../core/services/language';
import { TranslateService } from '@ngx-translate/core';
import { UsersService } from '../../../core/api/users.service';
import { GeoLocationService } from '../../../core/services/geo-location.service';

// Mocks
class MockAuthService {
  register = jest.fn().mockReturnValue(of({}));
  currentUser = jest.fn().mockReturnValue(null);
}
class MockRecaptchaService {
  execute = jest.fn().mockReturnValue(of('mock-token'));
}
class MockCountryService {
  currentCountry = jest.fn().mockReturnValue({ code: 'DO', currencyCode: 'DOP', name: 'Dominican Republic', formSchema: {} });
  currentCountryCode = jest.fn().mockReturnValue('do');
  detectAndSetCountry = jest.fn();
}
class MockTranslateService {
  addLangs = jest.fn();
  setDefaultLang = jest.fn();
  use = jest.fn();
  getBrowserLang = jest.fn().mockReturnValue('es');
}
class MockUsersService {
    updateUser = jest.fn().mockReturnValue(of({}));
}
class MockLanguageService {
    currentLang = jest.fn().mockReturnValue('es');
}

class MockGeoLocationService {
    getGeoLocation = jest.fn().mockReturnValue(of({ country: 'DO' }));
    mismatchSignal = jest.fn().mockReturnValue(null);
}

describe('RegisterPage', () => {
  let component: RegisterPage;
  let fixture: ComponentFixture<RegisterPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterPage, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useClass: MockAuthService },
        { provide: ReCaptchaV3Service, useClass: MockRecaptchaService },
        { provide: CountryService, useClass: MockCountryService },
        { provide: TranslateService, useClass: MockTranslateService },
        { provide: UsersService, useClass: MockUsersService },
        { provide: LanguageService, useClass: MockLanguageService },
        { provide: GeoLocationService, useClass: MockGeoLocationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default country values', () => {
    expect(component.registerForm).toBeDefined();
    expect(component.configuration.get('country')?.value).toBe('DO');
    expect(component.configuration.get('currency')?.value).toBe('DOP');
  });

  it('should validate required fields', () => {
    const accountInfo = component.accountInfo;

    // Check initial invalid state
    expect(accountInfo.valid).toBeFalsy();

    // Fill with valid data
    // Updated test: Removed jobTitle and phone as they are optional/not in the main validation check for required
    accountInfo.patchValue({
      firstName: 'John',
      lastName: 'Doe',
      email: 'test@example.com',
      // jobTitle: 'Developer', // Removed from expectation if not required
      // phone: '1234567890',
      passwordGroup: {
        password: 'Password123!',
        confirmPassword: 'Password123!'
      }
    });

    // Should be valid now
    expect(accountInfo.valid).toBeTruthy();
  });
});
