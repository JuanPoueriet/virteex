import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications: string[] = [];

  showSuccess(message: string): void {
    console.log(`SUCCESS: ${message}`);
    // En una implementación real mostraría un toast/alert
    alert(`✅ ${message}`);
  }

  showError(message: string): void {
    console.error(`ERROR: ${message}`);
    // En una implementación real mostraría un toast/alert
    alert(`❌ ${message}`);
  }
}