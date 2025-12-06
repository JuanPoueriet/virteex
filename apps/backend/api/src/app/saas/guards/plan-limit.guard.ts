import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SaasService } from '../saas.service';
import { PLAN_LIMIT_KEY } from '../decorators/plan-limit.decorator';

@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private saasService: SaasService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limitMetadata = this.reflector.get<{ resource: string; increment: number }>(
      PLAN_LIMIT_KEY,
      context.getHandler(),
    );

    if (!limitMetadata) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.organization) {
       // Allow if no user context (public) or throw?
       // If this guard is used, it implies we want to check limits for an org.
       throw new ForbiddenException('Organization context required for limit check');
    }

    const canProceed = await this.saasService.checkLimit(
      user.organization.id,
      limitMetadata.resource,
      limitMetadata.increment
    );

    if (!canProceed) {
      throw new ForbiddenException(`PLAN_LIMIT_REACHED: ${limitMetadata.resource}`);
    }

    return true;
  }
}
