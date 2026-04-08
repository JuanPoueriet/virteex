import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Plan } from '../models/plan.model';

export interface Subscription {
  planName: string;
  planId: string;
  status: string;
  price: number;
  billingCycle: 'mensual' | 'anual';
  nextBillingDate: string;
  trialEndsDate?: string;
}

export interface PaymentMethod {
  type: string;
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
  private http = inject(HttpClient);
  private apiUrl = '/api/v1'; // Assuming global prefix

  // Signals for state
  plans = signal<Plan[]>([]);

  constructor() {
    this.loadPlans();
  }

  loadPlans() {
    this.http.get<Plan[]>(`${this.apiUrl}/saas/plans`).pipe(
      tap(plans => this.plans.set(plans)),
      catchError(err => {
        console.error('Failed to load plans', err);
        return of([]);
      })
    ).subscribe();
  }

  getUsage(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/saas/usage`).pipe(
        catchError(err => {
            console.error('Failed to load usage', err);
            return of([]);
        })
    );
  }

  getSubscription(): Observable<Subscription> {
    return this.http.get<Subscription>(`${this.apiUrl}/saas/subscription`).pipe(
      catchError(err => {
        console.error('Failed to load subscription', err);
        return of({
          planName: 'Gratis',
          planId: 'free',
          status: 'Activo',
          price: 0,
          billingCycle: 'mensual',
          nextBillingDate: ''
        } as Subscription);
      })
    );
  }

  getPaymentMethod(): Observable<PaymentMethod | null> {
    return this.http.get<PaymentMethod | null>(`${this.apiUrl}/payment/method`).pipe(
      catchError(err => {
        console.error('Failed to load payment method', err);
        return of(null);
      })
    );
  }

  getPaymentHistory(): Observable<PaymentHistoryItem[]> {
    return this.http.get<PaymentHistoryItem[]>(`${this.apiUrl}/payment/invoices`).pipe(
      catchError(err => {
        console.error('Failed to load payment history', err);
        return of([]);
      })
    );
  }

  createPortalSession(): Observable<{ url: string } | null> {
    return this.http.post<{ url: string }>(`${this.apiUrl}/payment/portal-session`, {
      returnUrl: window.location.href
    }).pipe(
      catchError(err => {
        console.error('Failed to create portal session', err);
        return of(null);
      })
    );
  }

  changePlan(newPlanId: string): Observable<boolean> {
    console.log('Cambiando al plan:', newPlanId);
    // In a real app, this would call POST /payment/checkout-session with the priceId from the plan
    const plan = this.plans().find(p => p.slug === newPlanId || p.id === newPlanId);
    if (!plan) return of(false);

    // We would trigger the checkout flow here
    return this.http.post<{ sessionId: string, url: string }>(`${this.apiUrl}/payment/checkout-session`, {
        priceId: plan.monthlyPriceId, // Defaulting to monthly for now
        successUrl: window.location.href,
        cancelUrl: window.location.href
    }).pipe(
        map(res => {
            if (res.url) {
                window.location.href = res.url;
                return true;
            }
            return false;
        }),
        catchError(err => {
            console.error('Checkout failed', err);
            return of(false);
        })
    );
  }
}
