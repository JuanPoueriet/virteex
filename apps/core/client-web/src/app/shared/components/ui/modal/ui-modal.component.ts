import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';
import { trigger, style, animate, transition, query, animateChild, group } from '@angular/animations';

@Component({
  selector: 'app-ui-modal',
  imports: [LucideAngularModule],
  templateUrl: './ui-modal.component.html',
  styleUrls: ['./ui-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('modalContainer', [
      transition(':enter', [
        group([
          query('@modalBackdrop', animateChild()),
          query('@modalPanel', animateChild()),
        ])
      ]),
      transition(':leave', [
        group([
          query('@modalBackdrop', animateChild()),
          query('@modalPanel', animateChild()),
        ])
      ])
    ]),
    trigger('modalBackdrop', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('modalPanel', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 0, transform: 'scale(0.95)' }))
      ])
    ])
  ],
  host: {
    '(document:keydown.escape)': 'onEscape()'
  }
})
export class UiModalComponent {
  /**
   * Controls the visibility of the modal.
   */
  isOpen = input(false);

  /** Title of the modal displayed in the header */
  title = input('');

  /** Size of the modal: 'sm' | 'md' | 'lg' | 'xl' | 'full' */
  size = input<'sm' | 'md' | 'lg' | 'xl' | 'full'>('md');

  /** Whether to show the close button in the header */
  hideCloseButton = input(false);

  /** Whether clicking the backdrop closes the modal */
  closeOnBackdropClick = input(true);

  close = output<void>();

  readonly XIcon = X;

  onEscape() {
    this.closeModal();
  }

  onBackdropClick() {
    if (this.closeOnBackdropClick()) {
      this.closeModal();
    }
  }

  closeModal() {
    this.close.emit();
  }
}
