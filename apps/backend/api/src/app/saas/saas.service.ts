import { Injectable, OnModuleInit, Logger, ForbiddenException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Plan } from './entities/plan.entity';
import { PlanLimit, LimitType } from './entities/plan-limit.entity';
import { UsageMetric } from './entities/usage-metric.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { ConfigService } from '@nestjs/config';
import { SaasResource } from './enums/saas-resource.enum';
import { SAAS_PLANS } from './saas.config';
import { DateTime } from 'luxon';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsageMetricRepository } from './repositories/usage-metric.repository';
import { OrganizationSubscriptionHistory } from '../organizations/entities/organization-subscription-history.entity';

@Injectable()
export class SaasService implements OnModuleInit {
  private readonly logger = new Logger(SaasService.name);

  constructor(
    @InjectRepository(Plan) private planRepository: Repository<Plan>,
    @InjectRepository(PlanLimit) private limitRepository: Repository<PlanLimit>,
    @InjectRepository(Organization) private orgRepository: Repository<Organization>,
    @InjectRepository(UsageMetric) private usageRepository: Repository<UsageMetric>,
    @InjectRepository(OrganizationSubscriptionHistory) private subscriptionHistoryRepository: Repository<OrganizationSubscriptionHistory>,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private usageMetricRepository: UsageMetricRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async onModuleInit() {
    await this.seedPlans();
  }

  async seedPlans() {
    const count = await this.planRepository.count();
    if (count > 0) return;

    this.logger.log('Seeding SaaS Plans from Config...');

    for (const pConfig of SAAS_PLANS) {
        const monthlyPriceId = process.env[pConfig.monthlyPriceIdVar];

        // Skip if price ID missing in prod? No, maybe just log warning or create without it.
        // For seeding, we create structure.

        const plan = this.planRepository.create({
            slug: pConfig.slug,
            name: pConfig.name,
            monthlyPriceId: monthlyPriceId,
            limits: pConfig.limits.map(l => ({
                resource: l.resource,
                limit: l.limit,
                period: l.period,
                allowOverage: l.allowOverage ?? false
            }))
        });

        await this.planRepository.save(plan);
    }

    this.logger.log('SaaS Plans seeded.');
  }

  async getPlans() {
    return this.planRepository.find({ relations: ['limits'] });
  }

  async getPlanBySlug(slug: string) {
    return this.planRepository.findOne({ where: { slug }, relations: ['limits'] });
  }

  /**
   * Upgrades or changes the plan for an organization and records the history.
   * NOTE: This should be called within a transaction if possible, or manages its own.
   */
  async changePlan(organizationId: string, newPlanSlug: string, userId?: string, reason: string = 'upgrade'): Promise<void> {
      const org = await this.orgRepository.findOne({ where: { id: organizationId }, relations: ['plan'] });
      if (!org) {
          throw new Error('Organization not found');
      }

      const newPlan = await this.planRepository.findOne({ where: { slug: newPlanSlug } });
      if (!newPlan) {
          throw new Error('Plan not found');
      }

      if (org.plan && org.plan.id === newPlan.id) {
          return; // No change
      }

      const previousPlan = org.plan;

      // Update Org
      org.plan = newPlan;
      await this.orgRepository.save(org);

      // Record History
      const history = this.subscriptionHistoryRepository.create({
          organizationId: org.id,
          previousPlanId: previousPlan?.id,
          newPlanId: newPlan.id,
          changedBy: userId,
          reason: reason
      });

      await this.subscriptionHistoryRepository.save(history);

      this.logger.log(`Organization ${organizationId} changed plan from ${previousPlan?.slug ?? 'none'} to ${newPlan.slug}`);
  }

  /**
   * Enforces plan limits within a transaction context.
   * This method atomically checks and increments usage, preventing race conditions.
   * If the limit is reached, it throws a ForbiddenException (unless overage is allowed), which will abort the transaction.
   *
   * WARNING: Must be called within a transaction manager.
   */
  async enforceLimit(manager: EntityManager, organizationId: string, resource: SaasResource, increment: number = 1): Promise<void> {
    const org = await manager.findOne(Organization, {
        where: { id: organizationId },
        relations: ['plan', 'plan.limits']
    });

    if (!org || !org.plan) {
        throw new ForbiddenException(`Organization ${organizationId} has no plan assigned.`);
    }

    const limitDef = org.plan.limits.find(l => l.resource === resource);
    if (!limitDef) {
        // Assume unrestricted if not in limits.
        return;
    }

    // Handle BOOLEAN limits (Entitlements)
    if (limitDef.valueType === LimitType.BOOLEAN) {
       // If limit is boolean, we typically check 'isEnabled' or 'limit > 0'
       // If isEnabled is false, we throw.
       if (!limitDef.isEnabled) {
           throw new ForbiddenException(`FEATURE_NOT_ENABLED: ${resource}`);
       }
       // For Boolean features, 'increment' is usually irrelevant, but we might want to track usage count ANYWAY?
       // Usually Entitlements just check access.
       // We can return here without incrementing anything.
       return;
    }

    // Determine period key using Organization Timezone (Robust Billing Cycle)
    let periodKey = 'lifetime';
    if (limitDef.period === 'monthly') {
        // Use UTC to normalize billing periods, ignoring local timezone shifts for billing accounting
        periodKey = DateTime.now().toUTC().toFormat('yyyy-MM');
    }

    const allowOverage = limitDef.allowOverage;
    const isUnlimited = limitDef.isUnlimited || limitDef.limit === -1;

    const result = await this.usageMetricRepository.incrementUsage(
        manager,
        organizationId,
        resource,
        periodKey,
        increment,
        isUnlimited ? -1 : limitDef.limit,
        allowOverage
    );

    // Invalidate/Update Cache on Usage Change
    // We invalidate the cache so the next Guard check fetches fresh data or updates the cache.
    // Or we could update it directly if we knew the logic, but invalidation is safer.
    const cacheKey = `plan_limit:${organizationId}:${resource}`;

    if (result.limitReached) {
        await this.cacheManager.set(cacheKey, false, 5 * 60 * 1000); // Cache "Blocked"
        this.emitLimitReachedEvent(organizationId, resource, result.count, limitDef.limit);
        throw new ForbiddenException(`PLAN_LIMIT_REACHED: ${resource}`);
    } else {
        // If we are close to limit, maybe we shouldn't cache "True" for long?
        // For now, just invalidate so next read is fresh.
        await this.cacheManager.del(cacheKey);

        if (allowOverage && !isUnlimited && result.count > limitDef.limit) {
            this.emitLimitReachedEvent(organizationId, resource, result.count, limitDef.limit);
        }
    }
  }

  // Removed private incrementUsageTransactional as it is now handled by usageMetricRepository

  async checkLimit(organizationId: string, resource: SaasResource, increment: number): Promise<boolean> {
    const org = await this.orgRepository.findOne({
        where: { id: organizationId },
        relations: ['plan', 'plan.limits']
    });

    if (!org || !org.plan) return false;

    const limitDef = org.plan.limits.find(l => l.resource === resource);
    if (!limitDef) return true;

    // Handle BOOLEAN Entitlement check
    if (limitDef.valueType === LimitType.BOOLEAN) {
        return limitDef.isEnabled;
    }

    if (limitDef.limit === -1) return true;
    if (limitDef.allowOverage) return true;

    // Use limit definition for period
    let period = 'lifetime';
    if (limitDef.period === 'monthly') {
         const timezone = org.timezone || 'UTC';
         period = DateTime.now().setZone(timezone).toFormat('yyyy-MM');
    }

    const metric = await this.usageRepository.findOne({
        where: { organizationId, resource, period }
    });

    const currentUsage = metric ? metric.count : 0;
    return (currentUsage + increment) <= limitDef.limit;
  }

  private emitLimitReachedEvent(organizationId: string, resource: SaasResource, currentUsage: number, limit: number) {
      this.eventEmitter.emit('saas.limit_reached', {
          organizationId,
          resource,
          currentUsage,
          limit,
          timestamp: new Date()
      });
  }
}
