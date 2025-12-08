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
      [ngClass]="getClasses()"
      (click)="onClick.emit($event)"
      class="w-full relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group">

      <!-- Loading Spinner -->
      <span *ngIf="loading" class="absolute inset-0 flex items-center justify-center bg-inherit">
        <svg class="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </span>

      <!-- Button Content -->
      <span [class.opacity-0]="loading" class="flex items-center gap-2">
        <ng-content select="[icon]"></ng-content>
        <ng-content></ng-content>
      </span>

      <!-- Ripple/Highlight effect on hover -->
      <div class="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </button>
  `
})
export class AuthButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'primary';
  @Input() disabled = false;
  @Input() loading = false;
  @Output() onClick = new EventEmitter<Event>();

  getClasses(): string {
    const base = 'transform active:scale-[0.98]';
    switch (this.variant) {
      case 'primary':
        return `${base} bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 border border-transparent`;
      case 'secondary':
        return `${base} bg-bg-tertiary text-text-primary hover:bg-bg-hover border border-white/5`;
      case 'outline':
        return `${base} bg-transparent border-2 border-border-color text-text-primary hover:border-primary hover:text-primary`;
      case 'ghost':
        return `${base} bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/5`;
      default:
        return base;
    }
  }
}
