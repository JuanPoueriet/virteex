import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { ModalOptions } from '../../service/modal.service';
import { UiModalComponent, ModalFooterDirective } from '../ui/modal/ui-modal.component';
import { trigger, transition, query, animateChild } from '@angular/animations';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [UiModalComponent, ModalFooterDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  animations: [
    trigger('hostAnimation', [
      transition(':leave', [
        query('@*', animateChild(), { optional: true })
      ])
    ])
  ],
  host: {
    '[@hostAnimation]': 'true'
  }
})
export class ModalComponent {
  public readonly options = input.required<ModalOptions>();
  public readonly onConfirm = output<void>();
  public readonly onCancel = output<void>();
  public readonly onCloseModal = output<void>();

  confirm() {
    this.onConfirm.emit();
  }

  cancel() {
    this.onCancel.emit();
  }
  
  close() {
    this.onCloseModal.emit();
  }
}
