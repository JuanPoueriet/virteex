import { Injectable, OnModuleInit, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Plan } from './entities/plan.entity';
import { PlanLimit } from './entities/plan-limit.entity';
import { UsageMetric } from './entities/usage-metric.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { ConfigService } from '@nestjs/config';
import { SaasResource } from './enums/saas-resource.enum';
import { SAAS_PLANS } from './saas.config';
import { DateTime } from 'luxon';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SaasService implements OnModuleInit {
  private readonly logger = new Logger(SaasService.name);

  constructor(
    @InjectRepository(Plan) private planRepository: Repository<Plan>,
    @InjectRepository(PlanLimit) private limitRepository: Repository<PlanLimit>,
    @InjectRepository(Organization) private orgRepository: Repository<Organization>,
    @InjectRepository(UsageMetric) private usageRepository: Repository<UsageMetric>,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2
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

    // Determine period key using Organization Timezone
    let periodKey = 'lifetime';
    if (limitDef.period === 'monthly') {
        const timezone = org.timezone || 'UTC';
        periodKey = DateTime.now().setZone(timezone).toFormat('yyyy-MM');
    }

    if (limitDef.limit === -1) {
        // Unlimited, but we still track usage
        await this.incrementUsageTransactional(manager, organizationId, resource, periodKey, increment);
        return;
    }

    // Check Overage
    const allowOverage = limitDef.allowOverage;

    // Atomic Upsert with Optimistic Check

    // Step 1: Try Update if exists
    // We update count regardless of limit first (to lock row), or check limit in WHERE?
    // If we want to allow overage, we don't check limit in WHERE.
    // If we deny overage, we check limit in WHERE.

    let updateQuery = `
         UPDATE saas_usage_metrics
         SET count = count + $1, updated_at = NOW()
         WHERE organization_id = $2 AND resource = $3 AND period = $4
    `;

    const params = [increment, organizationId, resource, periodKey];

    if (!allowOverage) {
        // Only update if it stays within limit
        updateQuery += ` AND count + $1 <= $5`;
        params.push(limitDef.limit);
    }

    updateQuery += ` RETURNING count`;

    const updateResult = await manager.query(updateQuery, params);

    if (updateResult[0]) {
        // Updated successfully.
        // If overage allowed, we might want to log or warn if it exceeded limit.
        if (allowOverage && updateResult[0].count > limitDef.limit) {
             this.emitLimitReachedEvent(organizationId, resource, updateResult[0].count, limitDef.limit);
        }
        return;
    }

    // Step 2: Try Insert (if update didn't touch anything)
    // If update failed, it was either (a) Row Missing, or (b) Limit Reached (and no overage).

    try {
        const insertResult = await manager.query(
            `INSERT INTO saas_usage_metrics (organization_id, resource, period, count, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING count`,
            [organizationId, resource, periodKey, increment]
        );

        // Insert succeeded.
        // Check if initial increment exceeds limit (edge case).
        if (!allowOverage && insertResult[0].count > limitDef.limit) {
             // Rollback manually effectively happens by throwing exception
             throw new ForbiddenException(`PLAN_LIMIT_REACHED: ${resource}`);
        } else if (allowOverage && insertResult[0].count > limitDef.limit) {
             this.emitLimitReachedEvent(organizationId, resource, insertResult[0].count, limitDef.limit);
        }
        return;

    } catch (err) {
        // If Unique Violation (23505), it means row existed.
        // If row existed, and UPDATE failed, it means:
        // Case 1: allowOverage=false AND limit reached. -> Throw.
        // Case 2: Race condition (row inserted between Update and Insert attempts). -> Retry?
        // Actually, if row existed, UPDATE should have worked UNLESS limit was reached (if !allowOverage).
        // If allowOverage=true, UPDATE has no WHERE limit, so it should have worked.
        // So if we are here and allowOverage=true, it's weird (maybe race condition).

        if (err.code === '23505') {
             // To be robust against race condition "Inserted between Update and Insert":
             // If we hit a unique conflict, it means someone else inserted the row while we were trying to insert.
             // BUT, our initial UPDATE failed (returned 0 rows).
             // This implies the row was inserted *after* our UPDATE check but *before* our INSERT.

             // We must retry the UPDATE to see if we can increment the now-existing row.
             const retryUpdate = await manager.query(updateQuery, params);

             if (retryUpdate[0]) {
                 // Success on retry!
                 if (allowOverage && retryUpdate[0].count > limitDef.limit) {
                     this.emitLimitReachedEvent(organizationId, resource, retryUpdate[0].count, limitDef.limit);
                 }
                 return;
             }

             // If update STILL fails (returns 0 rows), it means the row exists (because of 23505)
             // BUT the condition (count <= limit) prevented the update.
             // Therefore, the limit is reached.

             if (!allowOverage) {
                 this.emitLimitReachedEvent(organizationId, resource, -1, limitDef.limit);
                 throw new ForbiddenException(`PLAN_LIMIT_REACHED: ${resource}`);
             } else {
                 // If allowOverage is true, the UPDATE should have succeeded unless something very weird happened (row deleted?).
                 // Ideally we shouldn't reach here if allowOverage=true and 23505 happened.
                 // Just return or throw generic.
                 return;
             }
        }
        throw err;
    }
  }

  private async incrementUsageTransactional(manager: EntityManager, organizationId: string, resource: SaasResource, periodKey: string, increment: number) {
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
