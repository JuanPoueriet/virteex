import { Component, EventEmitter, Output, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, style, animate, transition } from '@angular/animations';
import { ModalOptions } from '../../service/modal.service';
// import { ModalOptions } from '../../services/modal.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  animations: [
    trigger('fade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 })),
      ]),
    ]),
    trigger('slide', [
        transition(':enter', [
            style({ transform: 'translateY(30px) scale(0.95)', opacity: 0 }),
            animate('300ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'translateY(0) scale(1)', opacity: 1 })),
        ]),
        transition(':leave', [
            animate('200ms ease-in', style({ transform: 'translateY(30px)', opacity: 0 })),
        ]),
    ]),
  ],
})
export class ModalComponent {
  @Input() options!: ModalOptions;
  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();
  @Output() onCloseModal = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.close();
  }

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