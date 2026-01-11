import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiModalComponent } from './ui-modal.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { Component, signal } from '@angular/core';

@Component({
  imports: [UiModalComponent],
  template: `
    <app-ui-modal [isOpen]="isOpen()" [title]="title()" (close)="onClose()">
      <div footer>Footer Content</div>
    </app-ui-modal>
  `
})
class TestHostComponent {
  isOpen = signal(true);
  title = signal('Test Modal');
  onClose = jest.fn();
}

describe('UiModalComponent', () => {
  let component: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiModalComponent, NoopAnimationsModule, TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const titleEl = fixture.debugElement.query(By.css('.modal-title')).nativeElement;
    expect(titleEl.textContent).toContain('Test Modal');
  });

  it('should emit close event when close button is clicked', () => {
    const closeBtn = fixture.debugElement.query(By.css('.close-button'));
    closeBtn.triggerEventHandler('click', null);
    expect(component.onClose).toHaveBeenCalled();
  });

  it('should display footer content', () => {
    const footerEl = fixture.debugElement.query(By.css('.modal-footer'));
    expect(footerEl.nativeElement.textContent).toContain('Footer Content');
  });

  it('should not display when isOpen is false', () => {
    component.isOpen.set(false);
    fixture.detectChanges();
    const modalContainer = fixture.debugElement.query(By.css('.modal-container'));
    expect(modalContainer).toBeNull();
  });
});
