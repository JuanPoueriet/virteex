import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SaasService } from '../saas.service';
import { PLAN_LIMIT_KEY } from '../decorators/plan-limit.decorator';
import { SaasResource } from '../enums/saas-resource.enum';

@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private saasService: SaasService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limitMetadata = this.reflector.get<{ resource: SaasResource; increment: number }>(
      PLAN_LIMIT_KEY,
      context.getHandler(),
    );

    if (!limitMetadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.organization) {
       // Defensively check for organization context.
       // If public endpoint needs this guard, it must be handled carefully.
       // Here we enforce it.
       throw new ForbiddenException('Organization context required for limit check');
    }

    const canProceed = await this.saasService.checkLimit(
      user.organization.id,
      limitMetadata.resource,
      limitMetadata.increment
    );

    if (!canProceed) {
      // Note: This Guard is primarily for UX feedback and fail-fast.
      // Strict enforcement against race conditions happens in the Service layer (enforceLimit).
      throw new ForbiddenException(`PLAN_LIMIT_REACHED: ${limitMetadata.resource}`);
    }

    return true;
  }
}
