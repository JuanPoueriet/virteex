import { Injectable, OnModuleInit, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Plan } from './entities/plan.entity';
import { PlanLimit } from './entities/plan-limit.entity';
import { UsageMetric } from './entities/usage-metric.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { ConfigService } from '@nestjs/config';
import { SaasResource } from './enums/saas-resource.enum';

@Injectable()
export class SaasService implements OnModuleInit {
  private readonly logger = new Logger(SaasService.name);

  constructor(
    @InjectRepository(Plan) private planRepository: Repository<Plan>,
    @InjectRepository(PlanLimit) private limitRepository: Repository<PlanLimit>,
    @InjectRepository(Organization) private orgRepository: Repository<Organization>,
    @InjectRepository(UsageMetric) private usageRepository: Repository<UsageMetric>,
    private configService: ConfigService
  ) {}

  async onModuleInit() {
    await this.seedPlans();
  }

  async seedPlans() {
    const count = await this.planRepository.count();
    if (count > 0) return;

    this.logger.log('Seeding SaaS Plans...');

    const plans = [
      {
        slug: 'starter',
        name: 'Starter',
        stripeProductId: process.env.STRIPE_PRICE_STARTER ? 'prod_starter_placeholder' : null,
        monthlyPriceId: process.env.STRIPE_PRICE_STARTER,
        limits: [
          { resource: SaasResource.INVOICES, limit: 10, period: 'monthly' as const },
          { resource: SaasResource.USERS, limit: 2, period: 'lifetime' as const }
        ]
      },
      {
        slug: 'pro',
        name: 'Professional',
        monthlyPriceId: process.env.STRIPE_PRICE_PRO,
        limits: [
          { resource: SaasResource.INVOICES, limit: 100, period: 'monthly' as const },
          { resource: SaasResource.USERS, limit: 10, period: 'lifetime' as const }
        ]
      },
      {
        slug: 'enterprise',
        name: 'Enterprise',
        monthlyPriceId: process.env.STRIPE_PRICE_ENTERPRISE,
        limits: [
          { resource: SaasResource.INVOICES, limit: -1, period: 'monthly' as const },
          { resource: SaasResource.USERS, limit: -1, period: 'lifetime' as const }
        ]
      }
    ];

    for (const p of plans) {
      const plan = this.planRepository.create(p);
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
   * Enforces plan limits within a transaction context.
   * This method atomically checks and increments usage, preventing race conditions.
   * If the limit is reached, it throws a ForbiddenException, which will abort the transaction.
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

    if (limitDef.limit === -1) {
        // Unlimited, but we still track usage
        await this.incrementUsageTransactional(manager, organizationId, resource, limitDef.period, increment);
        return;
    }

    // Determine period
    const periodKey = limitDef.period === 'monthly'
        ? new Date().toISOString().slice(0, 7)
        : 'lifetime';

    // Atomic Upsert with Optimistic Check
    // We attempt the upsert. If it is an INSERT, it succeeds without limit check by SQL logic.
    // So we must check the returned count to verify if we breached the limit (in case of new insert exceeding limit).
    // Or we use a lock.

    // Strategy:
    // INSERT ... RETURNING count.
    // If INSERT happens, count is increment. We check increment <= limit.
    // If UPDATE happens, count is new_value. We check new_value <= limit.
    // BUT we used WHERE clause to prevent UPDATE.
    // So if UPDATE happens and fails WHERE, we get nothing.

    // To handle "Insert passing limit" properly:
    // We should NOT use WHERE clause on UPDATE if we want to catch it consistently?
    // No, if we don't use WHERE, we increment over limit. We want to avoid that.

    // Correct logic:
    // 1. Try UPDATE ... WHERE ... RETURNING count.
    // 2. If row updated, great.
    // 3. If no row updated, it might be (a) Not Exists, or (b) Limit Reached.
    // 4. Try INSERT ... RETURNING count.
    // 5. If Insert works, check count <= limit. If not, throw (and rollback).
    // 6. If Insert fails (Conflict), it means row exists (so step 3 was "Limit Reached"). Throw.

    // Let's refine this 2-step approach.

    // Step 1: Try Update if exists
    const updateResult = await manager.query(
        `UPDATE saas_usage_metrics
         SET count = count + $1, updated_at = NOW()
         WHERE organization_id = $2 AND resource = $3 AND period = $4 AND count + $1 <= $5
         RETURNING count`,
        [increment, organizationId, resource, periodKey, limitDef.limit]
    );

    if (updateResult[0]) {
        return; // Updated successfully within limit.
    }

    // Step 2: Try Insert (if update didn't touch anything)
    // Note: If update didn't touch, it could be "Limit Reached" or "Row Missing".
    // We try Insert. If it fails uniqueness, then "Row Existed" -> "Limit Reached".

    try {
        const insertResult = await manager.query(
            `INSERT INTO saas_usage_metrics (organization_id, resource, period, count, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING count`,
            [organizationId, resource, periodKey, increment]
        );

        // Insert succeeded. Check if initial increment exceeds limit (edge case: limit 0 or huge increment).
        if (insertResult[0].count > limitDef.limit) {
            throw new ForbiddenException(`PLAN_LIMIT_REACHED: ${resource}`);
        }
        return;

    } catch (err) {
        // If Unique Violation (23505), it means row existed, so UPDATE failed because of LIMIT.
        if (err.code === '23505') {
             throw new ForbiddenException(`PLAN_LIMIT_REACHED: ${resource}`);
        }
        throw err;
    }
  }

  private async incrementUsageTransactional(manager: EntityManager, organizationId: string, resource: SaasResource, periodType: 'monthly' | 'lifetime', increment: number) {
      const periodKey = periodType === 'monthly'
        ? new Date().toISOString().slice(0, 7)
        : 'lifetime';

      await manager.query(
        `INSERT INTO saas_usage_metrics (organization_id, resource, period, count, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (organization_id, resource, period)
         DO UPDATE SET count = saas_usage_metrics.count + $4, updated_at = NOW()`,
        [organizationId, resource, periodKey, increment]
      );
  }

  async checkLimit(organizationId: string, resource: SaasResource, increment: number): Promise<boolean> {
    const org = await this.orgRepository.findOne({
        where: { id: organizationId },
        relations: ['plan', 'plan.limits']
    });

    if (!org || !org.plan) return false;

    const limitDef = org.plan.limits.find(l => l.resource === resource);
    if (!limitDef) return true;
    if (limitDef.limit === -1) return true;

    // Use limit definition for period
    const period = limitDef.period === 'monthly'
        ? new Date().toISOString().slice(0, 7)
        : 'lifetime';

    const metric = await this.usageRepository.findOne({
        where: { organizationId, resource, period }
    });

    const currentUsage = metric ? metric.count : 0;
    return (currentUsage + increment) <= limitDef.limit;
  }
}
