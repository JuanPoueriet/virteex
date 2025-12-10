import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SecuritySettingsComponent } from './security-settings.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from '../../../core/services/auth';
import { NotificationService } from '../../../core/services/notification';
import { of } from 'rxjs';

describe('SecuritySettingsComponent', () => {
  let component: SecuritySettingsComponent;
  let fixture: ComponentFixture<SecuritySettingsComponent>;
  let authServiceMock: Partial<AuthService>;
  let notificationServiceMock: Partial<NotificationService>;

  beforeEach(async () => {
    authServiceMock = {
      currentUser: jest.fn().mockReturnValue({ isTwoFactorEnabled: false })
    };
    notificationServiceMock = {
      showSuccess: jest.fn(),
      showError: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [SecuritySettingsComponent, HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SecuritySettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
