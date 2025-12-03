import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MainLayout } from './main.layout';
import { AuthService } from '../../core/services/auth';
import { NotificationCenterService } from '../../core/services/notification-center.service';
import { BrandingService } from '../../core/services/branding';
import { SearchService } from '../../core/services/search.service';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { signal, WritableSignal } from '@angular/core';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

describe('MainLayout', () => {
  let component: MainLayout;
  let fixture: ComponentFixture<MainLayout>;

  // Mock Services
  const authServiceMock = {
    currentUser: signal({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      organization: { name: 'Test Org', logoUrl: null },
      roles: [{ name: 'admin', isSystemRole: true }]
    }),
    stopImpersonation: jest.fn().mockReturnValue(of({}))
  };

  const notificationCenterMock = {
    initialize: jest.fn(),
    unreadCount: signal(0),
    notifications: signal([]),
    markAllAsRead: jest.fn(),
    markAsRead: jest.fn()
  };

  const brandingServiceMock = {
    settings: signal({ layoutStyle: 'default' })
  };

  const searchServiceMock = {
    search: jest.fn().mockReturnValue(of([]))
  };

  beforeEach(async () => {
    // Mock matchMedia
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
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationCenterService, useValue: notificationCenterMock },
        { provide: BrandingService, useValue: brandingServiceMock },
        { provide: SearchService, useValue: searchServiceMock },
        {
             provide: ActivatedRoute,
             useValue: {
               snapshot: { paramMap: { get: () => null } },
               queryParams: of({})
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

  it('should toggle quick create modal', () => {
    expect(component.isQuickCreateModalOpen()).toBe(false);
    component.toggleQuickCreateModal();
    expect(component.isQuickCreateModalOpen()).toBe(true);
    component.toggleQuickCreateModal();
    expect(component.isQuickCreateModalOpen()).toBe(false);
  });

  it('should close quick create modal', () => {
    component.isQuickCreateModalOpen.set(true);
    component.closeQuickCreateModal();
    expect(component.isQuickCreateModalOpen()).toBe(false);
  });

  it('should toggle user menu and close others', () => {
    component.isNotificationMenuOpen.set(true);
    component.isQuickCreateModalOpen.set(true);

    component.toggleUserMenu();

    expect(component.isUserMenuOpen()).toBe(true);
    expect(component.isNotificationMenuOpen()).toBe(false);
    expect(component.isQuickCreateModalOpen()).toBe(false);
  });

  it('should toggle notification menu and close others', () => {
    component.isUserMenuOpen.set(true);
    component.isQuickCreateModalOpen.set(true);

    component.toggleNotificationMenu();

    expect(component.isNotificationMenuOpen()).toBe(true);
    expect(component.isUserMenuOpen()).toBe(false);
    expect(component.isQuickCreateModalOpen()).toBe(false);
  });

  it('should get correct icon for type', () => {
    const icon = component.getIconForType('products');
    expect(icon).toBeTruthy(); // Just check it returns something
    expect(component.getIconForType('')).toBeTruthy(); // Default icon
  });
});
