import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class SubscriptionActiveGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.organization) {
      // If Guard is applied, we expect Org context.
      // Assuming AuthGuard is applied before this.
      return true;
    }

    const status = user.organization.subscriptionStatus;

    // Grace period logic: Allow 'past_due' (payment failed, retrying)
    // 'active': Good
    // 'trialing': Good
    // 'past_due': Good (temporary)

    const allowedStatuses = ['active', 'trialing', 'past_due'];

    // If status is null/undefined, it might be a free tier or legacy.
    // If we want strict enterprise, we block unless explicitly allowed.
    // But let's check if 'plan' is free.
    // For now, if status is present, check it. If missing, assume active/free?
    // Let's assume if status is set, it must be valid.

    if (status && !allowedStatuses.includes(status)) {
        throw new ForbiddenException(`SUBSCRIPTION_SUSPENDED: Status is ${status}`);
    }

    return true;
  }
}
