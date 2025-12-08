import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [class]="'auth-btn ' + variant"
      [class.loading]="loading"
      (click)="onClick.emit($event)">

      <!-- Loading Spinner -->
      <span *ngIf="loading" class="spinner-container">
        <svg class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </span>

      <!-- Button Content -->
      <span [class.invisible]="loading" class="btn-content">
        <ng-content select="[icon]"></ng-content>
        <ng-content></ng-content>
      </span>

      <!-- Ripple effect -->
      <div class="ripple-overlay"></div>
    </button>
  `,
  styles: [`
    .auth-btn {
      width: 100%;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem; /* 12px 16px */
      border-radius: 0.75rem; /* 12px - xl */
      font-weight: 600;
      font-size: 0.95rem;
      transition: all 0.2s ease;
      outline: none;
      cursor: pointer;
      border: 1px solid transparent;
      overflow: hidden;

      &:focus-visible {
        box-shadow: 0 0 0 2px var(--bg-primary), 0 0 0 4px var(--primary);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &:active:not(:disabled) {
        transform: scale(0.98);
      }
    }

    /* Variants */
    .primary {
      background-color: var(--primary);
      color: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(var(--primary-rgb), 0.2), 0 2px 4px -1px rgba(var(--primary-rgb), 0.1);

      &:hover:not(:disabled) {
        background-color: var(--primary-hover);
        box-shadow: 0 10px 15px -3px rgba(var(--primary-rgb), 0.3), 0 4px 6px -2px rgba(var(--primary-rgb), 0.1);
      }
    }

    .secondary {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
      border-color: var(--border-color);

      &:hover:not(:disabled) {
        background-color: var(--bg-hover);
      }
    }

    .outline {
      background-color: transparent;
      border: 2px solid var(--border-color);
      color: var(--text-primary);

      &:hover:not(:disabled) {
        border-color: var(--primary);
        color: var(--primary);
      }
    }

    .ghost {
      background-color: transparent;
      color: var(--text-secondary);

      &:hover:not(:disabled) {
        color: var(--text-primary);
        background-color: rgba(255, 255, 255, 0.05);
      }
    }

    /* Spinner */
    .spinner-container {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      height: 1.25rem;
      width: 1.25rem;
      animation: spin 1s linear infinite;
    }

    .opacity-25 { opacity: 0.25; }
    .opacity-75 { opacity: 0.75; }

    .invisible {
      opacity: 0;
    }

    .btn-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .ripple-overlay {
      position: absolute;
      inset: 0;
      background-color: rgba(255, 255, 255, 0.1);
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
    }

    .auth-btn:hover .ripple-overlay {
      opacity: 1;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AuthButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'primary';
  @Input() disabled = false;
  @Input() loading = false;
  @Output() onClick = new EventEmitter<Event>();
}
