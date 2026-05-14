import { Component, input, output, effect, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { trigger, style, animate, transition, query, animateChild, group } from '@angular/animations';
import { LucideAngularModule, X } from 'lucide-angular';

@Component({
  selector: 'app-ui-modal',
  imports: [LucideAngularModule],
  templateUrl: './ui-modal.component.html',
  styleUrls: ['./ui-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()'
  },
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
  ]
})
export class UiModalComponent {
  /**
   * Controls the visibility of the modal.
   */
  readonly isOpen = input<boolean>(false);

  /** Title of the modal displayed in the header */
  readonly title = input<string>('');

  /** Size of the modal: 'sm' | 'md' | 'lg' | 'xl' | 'full' */
  readonly size = input<'sm' | 'md' | 'lg' | 'xl' | 'full'>('md');

  /** Whether to show the close button in the header */
  readonly hideCloseButton = input<boolean>(false);

  /** Whether clicking the backdrop closes the modal */
  readonly closeOnBackdropClick = input<boolean>(true);

  readonly close = output<void>();

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
