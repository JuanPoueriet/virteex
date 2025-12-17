import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { OtpComponent } from './otp.component';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { By } from '@angular/platform-browser';
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

@Component({
  template: `
    <app-otp
      [otpLength]="length()"
      (verify)="onVerify($event)"
    ></app-otp>
  `,
  imports: [OtpComponent],
  // standalone: true is default in v19+
  changeDetection: ChangeDetectionStrategy.OnPush
})
class TestHostComponent {
  length = signal(6);
  verifiedCode: string | undefined;

  onVerify(code: string) {
    this.verifiedCode = code;
  }
}

describe('OtpComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;
  let component: OtpComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, OtpComponent, TranslateModule.forRoot(), LucideAngularModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;

    // Initial detection to create child
    fixture.detectChanges();
    await fixture.whenStable();

    const otpDebugElement = fixture.debugElement.query(By.directive(OtpComponent));
    component = otpDebugElement.componentInstance;
  });

  afterEach(() => {
    // Manually clean up to prevent timers from leaking
    if (component) {
        component.ngOnDestroy();
    }
    jest.clearAllTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render correct number of inputs based on initial length', () => {
    const inputs = fixture.debugElement.queryAll(By.css('.otp-input'));
    expect(inputs.length).toBe(6);
  });

  it('should allow changing length dynamically from parent', async () => {
      hostComponent.length.set(4);
      fixture.detectChanges();
      await fixture.whenStable();

      // We need to trigger change detection in child because OnPush
      fixture.detectChanges();

      const inputs = fixture.debugElement.queryAll(By.css('.otp-input'));
      expect(inputs.length).toBe(4);
      expect(component.currentOtpLength()).toBe(4);
  });

  it('should handle input correctly', () => {
      const inputs = fixture.debugElement.queryAll(By.css('.otp-input'));
      const firstInput = inputs[0].nativeElement as HTMLInputElement;

      firstInput.value = '5';
      firstInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.otpValues()[0]).toBe('5');
  });

  it('should emit verify event when code is complete and verify button clicked', () => {
     const otp = ['1', '2', '3', '4', '5', '6'];
     component.otpValues.set(otp);
     fixture.detectChanges();

     component.onVerify();
     expect(hostComponent.verifiedCode).toBe('123456');
  });
});
