import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SaasService } from '../saas.service';
import { PLAN_LIMIT_KEY } from '../decorators/plan-limit.decorator';
import { SaasResource } from '../enums/saas-resource.enum';
import { LimitType } from '../entities/plan-limit.entity';

@Injectable()
export class PlanLimitGuard implements CanActivate {
  private readonly logger = new Logger(PlanLimitGuard.name);

  constructor(
    private reflector: Reflector,
    private saasService: SaasService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
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

    const cacheKey = `plan_limit:${user.organization.id}:${limitMetadata.resource}`;

    // 1. Try Cache first
    const cachedResult = await this.cacheManager.get<boolean>(cacheKey);
    if (cachedResult !== undefined) {
      if (!cachedResult) {
        throw new ForbiddenException(`PLAN_LIMIT_REACHED: ${limitMetadata.resource}`);
      }
      return true;
    }

    // Need to handle different limit types in Service, but for Guard optimization we can check generic "canProceed"
    // However, PlanLimit entity now supports BOOLEAN type.
    // We should rely on SaasService to interpret the type.
    const canProceed = await this.saasService.checkLimit(
      user.organization.id,
      limitMetadata.resource,
      limitMetadata.increment
    );

    // 2. Cache the result for a short period (fail-fast buffer)
    // We cache for 60 seconds. This reduces DB hits.
    // If the user hits the limit during this time, the Service layer will still block it (enforceLimit),
    // and subsequent requests might pass the guard until cache expires or is invalidated, but they will fail at service.
    // To be safer, if canProceed is false, we cache it longer. If true, shorter.
    const ttl = canProceed ? 60 * 1000 : 5 * 60 * 1000;
    await this.cacheManager.set(cacheKey, canProceed, ttl);

    if (!canProceed) {
      // Note: This Guard is primarily for UX feedback and fail-fast.
      // Strict enforcement against race conditions happens in the Service layer (enforceLimit).
      throw new ForbiddenException(`PLAN_LIMIT_REACHED: ${limitMetadata.resource}`);
    }

    return true;
  }
}
