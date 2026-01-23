import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MainLayout } from './main.layout';
import { AuthService } from '../../core/services/auth';
import { BrandingService } from '../../core/services/branding';
import { NotificationCenterService } from '../../core/services/notification-center.service';
import { SearchService } from '../../core/services/search.service';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

describe('MainLayout', () => {
  let component: MainLayout;
  let fixture: ComponentFixture<MainLayout>;

  const mockAuthService = {
    currentUser: signal({
      firstName: 'Test',
      lastName: 'User',
      organization: {
        name: 'Test Org',
        logoUrl: 'http://test.com/logo.png',
        subscriptionStatus: 'active',
        gracePeriodEnd: null
      },
      roles: [{ name: 'admin' }],
      isImpersonating: false
    }),
    stopImpersonation: () => of(true),
    logout: jest.fn()
  };

  const mockBrandingService = {
    settings: signal({
      layoutStyle: 'default'
    })
  };

  const mockNotificationCenterService = {
    initialize: jest.fn(),
    unreadCount: signal(0),
    notifications: signal([]),
    markAllAsRead: jest.fn(),
    markAsRead: jest.fn()
  };

  const mockSearchService = {
    search: jest.fn().mockReturnValue(of([]))
  };

  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    await TestBed.configureTestingModule({
      imports: [
        MainLayout,
        RouterTestingModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: BrandingService, useValue: mockBrandingService },
        { provide: NotificationCenterService, useValue: mockNotificationCenterService },
        { provide: SearchService, useValue: mockSearchService },
        // Fix for ActivatedRoute if needed by RouterLinkActive
         {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => 'es' } }, // Mock params if needed
            queryParams: of({}),
            params: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct layout class', () => {
    expect(component.layoutClass()).toBe('layout-default');
  });
});
