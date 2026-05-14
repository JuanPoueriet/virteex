import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
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
  readonly options = input.required<ModalOptions>();
  readonly onConfirm = output<void>();
  readonly onCancel = output<void>();
  readonly onCloseModal = output<void>();

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
