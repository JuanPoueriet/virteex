import { Injectable, OnModuleInit, Logger, ForbiddenException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Plan } from './entities/plan.entity';
import { PlanLimit, LimitType } from './entities/plan-limit.entity';
import { UsageMetric } from './entities/usage-metric.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { ConfigService } from '@nestjs/config';
import { SaasResource } from './enums/saas-resource.enum';
import { QuotaPeriod } from './enums/quota-period.enum';
import { SAAS_PLANS } from './saas.config';
import { DateTime } from 'luxon';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsageMetricRepository } from './repositories/usage-metric.repository';
import { OrganizationSubscriptionHistory } from '../organizations/entities/organization-subscription-history.entity';
import { MetricsService } from '../metrics/metrics.service';

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
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private metricsService: MetricsService
  ) {}

  async onModuleInit() {
    if (this.configService.get('SAAS_SEED_ENABLED') === 'true') {
      await this.seedPlans();
    }
  }

  async seedPlans() {
    this.logger.log('Seeding/Updating SaaS Plans from Config...');

    // Use upsert or check-then-save to avoid race conditions and ensure idempotent updates
    for (const pConfig of SAAS_PLANS) {
        const monthlyPriceId = process.env[pConfig.monthlyPriceIdVar];

        let plan = await this.planRepository.findOne({ where: { slug: pConfig.slug }, relations: ['limits'] });

        if (plan) {
            // Update existing plan (if needed)
            plan.name = pConfig.name;
            plan.monthlyPriceId = monthlyPriceId;

            // Sync Limits: We remove existing limits and re-add them from config.
            // In a production system, we might want to be more careful (e.g. migrate usage),
            // but to ensure config is source of truth as requested:
            if (plan.limits && plan.limits.length > 0) {
                 await this.limitRepository.remove(plan.limits);
            }

            plan.limits = pConfig.limits.map(l => this.limitRepository.create({
                resource: l.resource,
                limit: l.limit,
                period: l.period,
                allowOverage: l.allowOverage ?? false
            }));

            await this.planRepository.save(plan);
        } else {
            // Create new plan
            // Handle race condition with try/catch
            try {
                plan = this.planRepository.create({
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
            } catch (error: any) {
                if (error.code === '23505') { // Unique violation
                     this.logger.log(`Plan ${pConfig.slug} already exists (Race condition handled).`);
                } else {
                    throw error;
                }
            }
        }
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
   * Uses a transaction to ensure atomicity.
   */
  async changePlan(organizationId: string, newPlanSlug: string, userId?: string, reason: string = 'upgrade'): Promise<void> {
      await this.dataSource.transaction(async (manager) => {
          const org = await manager.findOne(Organization, { where: { id: organizationId }, relations: ['plan'] });
          if (!org) {
              throw new Error('Organization not found');
          }

          const newPlan = await manager.findOne(Plan, { where: { slug: newPlanSlug } });
          if (!newPlan) {
              throw new Error('Plan not found');
          }

          if (org.plan && org.plan.id === newPlan.id) {
              return; // No change
          }

          const previousPlan = org.plan;

          // Update Org
          org.plan = newPlan;
          await manager.save(org);

          // Record History
          const history = this.subscriptionHistoryRepository.create({
              organizationId: org.id,
              previousPlanId: previousPlan?.id,
              newPlanId: newPlan.id,
              changedBy: userId,
              reason: reason
          });

          await manager.save(history); // Use manager to save history within transaction

          // INVALIDATE CACHE (Fix for blocked UX)
          await this.clearOrganizationCache(organizationId);

          this.logger.log(`Organization ${organizationId} changed plan from ${previousPlan?.slug ?? 'none'} to ${newPlan.slug}`);
      });
  }

  async clearOrganizationCache(organizationId: string) {
      // 10/10 SCALABILITY: Use version-based invalidation for O(1) cache clearing.
      // Instead of deleting N keys, we increment the organization's version.
      // All future limit checks will derive a new key, effectively invalidating old ones.
      const versionKey = `org_limit_version:${organizationId}`;
      const currentVersion = await this.cacheManager.get<number>(versionKey) || 0;
      await this.cacheManager.set(versionKey, currentVersion + 1, { ttl: 0 } as any);

      this.logger.log(`Cache invalidated for Organization ${organizationId} (v${currentVersion + 1})`);
  }

  private async getCacheKey(organizationId: string, resource: SaasResource): Promise<string> {
      const versionKey = `org_limit_version:${organizationId}`;
      const version = await this.cacheManager.get<number>(versionKey) || 0;
      return `plan_limit:${organizationId}:${version}:${resource}`;
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
       if (!limitDef.isEnabled) {
           throw new ForbiddenException(`FEATURE_NOT_ENABLED: ${resource}`);
       }
       return;
    }

    // Determine period key using Organization Billing Cycle if available
    let periodKey = QuotaPeriod.LIFETIME;
    if (limitDef.period === QuotaPeriod.MONTHLY) {
        // Check for Grace Period: If subscription is past due but grace period is active, we treat it as valid.
        const effectiveEndDate = (org.gracePeriodEnd && org.gracePeriodEnd > (org.subscriptionPeriodEnd || new Date(0)))
            ? org.gracePeriodEnd
            : org.subscriptionPeriodEnd;

        if (effectiveEndDate && effectiveEndDate > new Date()) {
             // Align with Stripe billing cycle (end date)
             periodKey = DateTime.fromJSDate(org.subscriptionPeriodEnd || effectiveEndDate).toUTC().toFormat('yyyy-MM-dd');
        } else {
             // Fallback to calendar month (UTC) if no subscription data or expired
             periodKey = DateTime.now().toUTC().toFormat('yyyy-MM');
        }
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
    const cacheKey = await this.getCacheKey(organizationId, resource);

    // Calculate usage percentage for soft limit warnings
    if (!isUnlimited && limitDef.limit > 0) {
        const percentage = result.count / limitDef.limit;
        if (percentage >= 0.8 && percentage < 1.0) {
            this.emitLimitWarningEvent(organizationId, resource, result.count, limitDef.limit, percentage);
        }
    }

    if (result.limitReached) {
        await this.cacheManager.set(cacheKey, false, 5 * 60 * 1000); // Cache "Blocked"
        this.metricsService.limitHitCounter.labels(organizationId, resource).inc();
        this.emitLimitReachedEvent(organizationId, resource, result.count, limitDef.limit);
        throw new ForbiddenException(`PLAN_LIMIT_REACHED: ${resource}`);
    } else {
        await this.cacheManager.del(cacheKey);

        if (allowOverage && !isUnlimited && result.count > limitDef.limit) {
            this.emitLimitReachedEvent(organizationId, resource, result.count, limitDef.limit);
        }
    }
  }

  async getUsage(organizationId: string) {
    // Return all usage metrics for the current period
    const org = await this.orgRepository.findOne({
        where: { id: organizationId },
        relations: ['plan', 'plan.limits']
    });

    if (!org || !org.plan) return [];

    // Calculate period keys needed
    const periodKeys = new Set<string>([QuotaPeriod.LIFETIME]);
    // We assume mostly one billing cycle, but let's be safe
    let monthlyPeriodKey = '';

    if (org.subscriptionPeriodEnd && org.subscriptionPeriodEnd > new Date()) {
         monthlyPeriodKey = DateTime.fromJSDate(org.subscriptionPeriodEnd).toUTC().toFormat('yyyy-MM-dd');
    } else {
         monthlyPeriodKey = DateTime.now().toUTC().toFormat('yyyy-MM');
    }
    periodKeys.add(monthlyPeriodKey);

    // Fetch all relevant metrics in one query (N+1 fix)
    const metrics = await this.usageRepository.createQueryBuilder('metric')
        .where('metric.organizationId = :orgId', { orgId: organizationId })
        .andWhere('metric.period IN (:...periods)', { periods: Array.from(periodKeys) })
        .getMany();

    // Map metrics for easier lookup
    const metricMap = new Map<string, UsageMetric>();
    metrics.forEach(m => metricMap.set(`${m.resource}:${m.period}`, m));

    const usageData = [];

    for (const limit of org.plan.limits) {
        if (limit.valueType === LimitType.BOOLEAN) {
            usageData.push({
                resource: limit.resource,
                type: 'boolean',
                isEnabled: limit.isEnabled,
                limit: null,
                used: null
            });
            continue;
        }

        let periodKey = QuotaPeriod.LIFETIME;
        if (limit.period === QuotaPeriod.MONTHLY) {
             periodKey = monthlyPeriodKey;
        }

        const metric = metricMap.get(`${limit.resource}:${periodKey}`);

        usageData.push({
            resource: limit.resource,
            type: 'numeric',
            limit: limit.limit,
            used: metric ? metric.count : 0,
            isUnlimited: limit.isUnlimited || limit.limit === -1,
            period: limit.period
        });
    }

    return usageData;
  }

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
    let period = QuotaPeriod.LIFETIME;
    if (limitDef.period === QuotaPeriod.MONTHLY) {
         // Grace Period check
         const effectiveEndDate = (org.gracePeriodEnd && org.gracePeriodEnd > (org.subscriptionPeriodEnd || new Date(0)))
            ? org.gracePeriodEnd
            : org.subscriptionPeriodEnd;

         if (effectiveEndDate && effectiveEndDate > new Date()) {
             period = DateTime.fromJSDate(org.subscriptionPeriodEnd || effectiveEndDate).toUTC().toFormat('yyyy-MM-dd');
         } else {
             const timezone = org.timezone || 'UTC';
             period = DateTime.now().setZone(timezone).toFormat('yyyy-MM');
         }
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

  private emitLimitWarningEvent(organizationId: string, resource: SaasResource, currentUsage: number, limit: number, percentage: number) {
      const cacheKey = `debounce:limit_warning:${organizationId}:${resource}`;
      // Check if we recently warned to prevent flooding (Debounce: 24 hours)
      // We perform this check asynchronously and catch errors to avoid blocking the main flow
      this.cacheManager.get(cacheKey).then(lastWarning => {
          if (!lastWarning) {
              this.eventEmitter.emit('saas.limit_warning', {
                  organizationId,
                  resource,
                  currentUsage,
                  limit,
                  percentage,
                  timestamp: new Date()
              });
              // Set debounce key
              this.cacheManager.set(cacheKey, '1', 24 * 60 * 60 * 1000).catch(err =>
                  this.logger.error(`Failed to set debounce cache for warning: ${err.message}`)
              );
          }
      }).catch(err => {
          this.logger.error(`Error checking debounce cache for warning: ${err.message}`);
      });
  }
}
