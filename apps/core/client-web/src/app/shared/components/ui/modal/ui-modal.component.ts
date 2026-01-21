import { Component, ChangeDetectionStrategy, input, output, contentChild, Directive, ElementRef } from '@angular/core';
import { trigger, style, animate, transition, query, animateChild, group } from '@angular/animations';
import { LucideAngularModule, X } from 'lucide-angular';

@Directive({
  selector: '[appModalFooter]',
  standalone: true
})
export class ModalFooterDirective {}

@Component({
  selector: 'app-ui-modal',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ui-modal.component.html',
  styleUrls: ['./ui-modal.component.scss'],
  host: {
    '(document:keydown.escape)': 'onEscape()'
  },
  animations: [
    trigger('modalContainer', [
      transition(':enter', [
        group([
          query('@modalBackdrop', animateChild(), { optional: true }),
          query('@modalPanel', animateChild(), { optional: true }),
        ])
      ]),
      transition(':leave', [
        group([
          query('@modalBackdrop', animateChild(), { optional: true }),
          query('@modalPanel', animateChild(), { optional: true }),
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
  /** Title of the modal displayed in the header */
  public readonly title = input<string>('');

  /** Size of the modal: 'sm' | 'md' | 'lg' | 'xl' | 'full' */
  public readonly size = input<'sm' | 'md' | 'lg' | 'xl' | 'full'>('md');

  /** Whether to show the close button in the header */
  public readonly hideCloseButton = input(false);

  /** Whether clicking the backdrop closes the modal */
  public readonly closeOnBackdropClick = input(true);

  public readonly close = output<void>();

  public readonly footer = contentChild(ModalFooterDirective);

  public readonly XIcon = X;

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
