
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthFooterComponent } from '../auth-footer/auth-footer.component';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, AuthFooterComponent],
  template: `
    <div class="min-h-screen h-screen w-full flex overflow-hidden bg-gray-50 relative">
      <!-- Background Effect (Glassmorphism/Gradient) -->
      <div class="absolute inset-0 z-0">
          <div class="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-70"></div>
          <!-- Decorative Blobs -->
          <div class="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-60 animate-pulse-slow"></div>
          <div class="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-3xl opacity-50"></div>
      </div>

      <!-- Main Content Container -->
      <div class="flex-1 flex flex-col justify-center items-center relative z-10 px-4 sm:px-6 lg:px-8 w-full">

        <!-- Logo Header -->
        <div class="mb-8 flex justify-center w-full">
           <!-- Dynamic Logo logic could go here or pass via content projection if needed, but usually static for Auth -->
           <img src="assets/images/logo.svg" alt="App Logo" class="h-12 w-auto drop-shadow-sm" />
        </div>

        <!-- Auth Card -->
        <div class="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 w-full max-w-md p-8 sm:p-10 transform transition-all hover:shadow-2xl duration-500">
           <ng-content></ng-content>
        </div>

      </div>

      <!-- Footer -->
      <app-auth-footer></app-auth-footer>
    </div>
  `,
  styles: [`
    .animate-pulse-slow {
      animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 0.3; }
    }
  `]
})
export class AuthLayoutComponent {}
