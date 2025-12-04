import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeoMismatchModalComponent } from './geo-mismatch-modal.component';
import { GeoLocationService } from '../../../core/services/geo-location.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';

class MockGeoLocationService {
  mismatchSignal = signal<{ detected: string, current: string } | null>(null);
}

class MockRouter {
  url = '/es/do/home';
  navigate = jest.fn();
}

describe('GeoMismatchModalComponent', () => {
  let component: GeoMismatchModalComponent;
  let fixture: ComponentFixture<GeoMismatchModalComponent>;
  let geoService: MockGeoLocationService;
  let router: MockRouter;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeoMismatchModalComponent],
      providers: [
        { provide: GeoLocationService, useClass: MockGeoLocationService },
        { provide: Router, useClass: MockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GeoMismatchModalComponent);
    component = fixture.componentInstance;
    geoService = TestBed.inject(GeoLocationService) as unknown as MockGeoLocationService;
    router = TestBed.inject(Router) as unknown as MockRouter;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show modal when signal has value', () => {
    geoService.mismatchSignal.set({ detected: 'CO', current: 'DO' });
    fixture.detectChanges();
    const modalElement = fixture.nativeElement.querySelector('.fixed');
    expect(modalElement).toBeTruthy();
  });

  it('should not show modal when signal is null', () => {
    geoService.mismatchSignal.set(null);
    fixture.detectChanges();
    const modalElement = fixture.nativeElement.querySelector('.fixed');
    expect(modalElement).toBeFalsy();
  });

  it('should clear signal on close', () => {
    geoService.mismatchSignal.set({ detected: 'CO', current: 'DO' });
    fixture.detectChanges();
    component.close();
    expect(geoService.mismatchSignal()).toBeNull();
  });
});
