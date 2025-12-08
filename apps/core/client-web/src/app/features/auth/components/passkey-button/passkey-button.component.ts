import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthButtonComponent } from '../auth-button/auth-button.component';

@Component({
  selector: 'app-passkey-button',
  standalone: true,
  imports: [CommonModule, AuthButtonComponent],
  template: `
    <app-auth-button
        variant="secondary"
        (onClick)="onClick.emit()"
        [loading]="loading"
        class="w-full">
      <svg icon xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="passkey-icon"><circle cx="12" cy="12" r="10"/><path d="m15 15-4-4"/><path d="m15 19-4-4"/><path d="M7 17l6.5-6.5a4 4 0 0 1 5.656 0 4 4 0 0 1 0 5.656L17 19"/></svg>
      <ng-content></ng-content>
    </app-auth-button>
  `,
  styles: [`
    .passkey-icon {
      color: var(--text-primary);
    }
  `]
})
export class PasskeyButtonComponent {
    @Input() loading = false;
    @Output() onClick = new EventEmitter<void>();
}
