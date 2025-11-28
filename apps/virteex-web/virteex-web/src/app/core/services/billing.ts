import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface Subscription {
  planName: 'Profesional' | 'Explorador' | 'Empresarial';
  planId: 'pro' | 'trial' | 'enterprise';
  status: 'Activo' | 'Prueba' | 'Cancelado';
  price: number;
  billingCycle: 'mensual' | 'anual';
  nextBillingDate: string;
  trialEndsDate?: string;
}

export interface PaymentMethod {
  type: 'Visa' | 'MasterCard';
  last4: string;
  expiryDate: string;
}

export interface PaymentHistoryItem {
  id: string;
  date: string;
  description: string;
  amount: number;
}

@Injectable({ providedIn: 'root' })
export class BillingService {

  // Simulación de datos del usuario actual
  currentSubscription = signal<Subscription>({
    planName: 'Profesional',
    planId: 'pro',
    status: 'Activo',
    price: 49.00,
    billingCycle: 'mensual',
    nextBillingDate: '2025-08-20',
  });

  paymentMethod = signal<PaymentMethod>({
    type: 'Visa',
    last4: '4242',
    expiryDate: '12/27'
  });

  paymentHistory = signal<PaymentHistoryItem[]>([
    { id: 'pay_1', date: '2025-07-20', description: 'Suscripción Mensual - Plan Profesional', amount: 49.00 },
    { id: 'pay_2', date: '2025-06-20', description: 'Suscripción Mensual - Plan Profesional', amount: 49.00 },
    { id: 'pay_3', date: '2025-05-20', description: 'Suscripción Mensual - Plan Profesional', amount: 49.00 },
  ]);

  // Métodos que simulan llamadas a una API
  getSubscription(): Observable<Subscription> {
    return of(this.currentSubscription()).pipe(delay(300));
  }

  getPaymentMethod(): Observable<PaymentMethod> {
    return of(this.paymentMethod()).pipe(delay(300));
  }

  getPaymentHistory(): Observable<PaymentHistoryItem[]> {
    return of(this.paymentHistory()).pipe(delay(500));
  }

  changePlan(newPlanId: 'pro' | 'trial' | 'enterprise'): Observable<boolean> {
    console.log('Cambiando al plan:', newPlanId);
    // Aquí iría la lógica para actualizar la suscripción en el backend
    return of(true).pipe(delay(1000));
  }
}