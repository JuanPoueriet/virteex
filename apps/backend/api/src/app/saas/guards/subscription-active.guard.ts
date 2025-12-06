import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class SubscriptionActiveGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.organization) {
      // If endpoint is public or user not logged in, this guard might be skipped by standard AuthGuard,
      // but if applied, we expect a user.
      return true;
    }

    const status = user.organization.subscriptionStatus;
    // status can be 'active', 'trialing', 'past_due' (grace period), 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'

    // Allow 'active' and 'trialing'.
    // Maybe allow 'past_due' for a grace period? The audit said "Grace logic".
    // For now, let's strict check for active/trialing.
    // If null, it might be a free tier or legacy. Let's assume 'active' if null for backward compatibility unless we strictly enforce it.
    // The audit said "Passive subscription status".

    // Strict mode:
    const allowedStatuses = ['active', 'trialing'];

    if (status && !allowedStatuses.includes(status)) {
        throw new ForbiddenException(`SUBSCRIPTION_SUSPENDED: Status is ${status}`);
    }

    return true;
  }
}
