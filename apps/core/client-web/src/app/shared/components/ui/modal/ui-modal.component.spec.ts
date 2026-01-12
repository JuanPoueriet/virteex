import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiModalComponent } from './ui-modal.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component } from '@angular/core';

@Component({
  template: `<app-ui-modal [isOpen]="true" [title]="'Test Title'" (close)="onClose()"></app-ui-modal>`,
  imports: [UiModalComponent]
})
class TestHostComponent {
  onClose() {}
}

describe('UiModalComponent', () => {
  let component: UiModalComponent;
  let fixture: ComponentFixture<UiModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiModalComponent, NoopAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UiModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('title', 'Test Modal');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const titleEl = fixture.nativeElement.querySelector('.modal-title');
    expect(titleEl.textContent).toContain('Test Modal');
  });

  it('should emit close event', () => {
    const spy = jest.spyOn(component.close, 'emit');
    component.closeModal();
    expect(spy).toHaveBeenCalled();
  });
});
