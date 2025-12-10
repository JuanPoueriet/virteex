import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyProfilePage } from './my-profile.page';
import { AuthService } from '../../../core/services/auth';
import { UsersService } from '../../../core/api/users.service';
import { NotificationService } from '../../../core/services/notification';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

class MockAuthService {
  currentUser = () => ({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '1234567890',
    jobTitle: 'Developer',
    preferredLanguage: 'en'
  });
}

class MockUsersService {
  updateProfile = jest.fn().mockReturnValue(of({}));
  getJobTitles = jest.fn().mockReturnValue(of(['CEO', 'Developer']));
}

class MockNotificationService {
  showSuccess = jest.fn();
  showError = jest.fn();
}

describe('MyProfilePage', () => {
  let component: MyProfilePage;
  let fixture: ComponentFixture<MyProfilePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyProfilePage, BrowserAnimationsModule, HttpClientTestingModule],
      providers: [
        { provide: AuthService, useClass: MockAuthService },
        { provide: UsersService, useClass: MockUsersService },
        { provide: NotificationService, useClass: MockNotificationService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with user data including phone and jobTitle', () => {
    // Manually trigger ngOnChanges or wait for signals if needed,
    // but here we just check if the form was created with values from currentUser
    expect(component.profileForm.get('phone')?.value).toBe('1234567890');
    expect(component.profileForm.get('jobTitle')?.value).toBe('Developer');
  });
});
