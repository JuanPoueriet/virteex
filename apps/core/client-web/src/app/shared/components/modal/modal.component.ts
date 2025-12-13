import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { ModalOptions } from '../../service/modal.service';
import { UiModalComponent } from '../ui/modal';

@Component({
  selector: 'app-modal',
  imports: [UiModalComponent],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalComponent {
  options = input.required<ModalOptions>();
  onConfirm = output<void>();
  onCancel = output<void>();
  onCloseModal = output<void>();

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
