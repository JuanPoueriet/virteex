import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UsageMetric } from '../entities/usage-metric.entity';
import { SaasService } from '../saas.service';
import { Organization } from '../../organizations/entities/organization.entity';

@Injectable()
export class SaasCronService {
  private readonly logger = new Logger(SaasCronService.name);

  constructor(
    @InjectRepository(UsageMetric)
    private readonly usageRepository: Repository<UsageMetric>,
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    private readonly saasService: SaasService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  /**
   * Reconciles Redis counters with the Database source of truth.
   * This ensures eventual consistency in case of transaction rollbacks
   * or Redis persistence failures.
   *
   * Run every night at 2 AM.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async reconcileUsageCounters() {
    this.logger.log('Starting SaaS Usage Reconciliation...');

    // 1. Get active metrics from DB (only those that might have discrepancies)
    // We process in batches to avoid memory issues
    const BATCH_SIZE = 100;
    let skip = 0;
    let hasMore = true;
    let reconciledCount = 0;

    while (hasMore) {
        const metrics = await this.usageRepository.find({
            take: BATCH_SIZE,
            skip: skip,
            relations: ['organization'] // Load org to determine period key accurately if needed
        });

        if (metrics.length === 0) {
            hasMore = false;
            break;
        }

        for (const metric of metrics) {
            try {
                // Determine the cache key for this metric
                // We need to reconstruct the periodKey used in SaasService
                // stored in metric.period
                const periodKey = metric.period;
                const resource = metric.resource;
                const organizationId = metric.organizationId;
                const dbCount = metric.count;

                const cacheKey = `usage_counter:${organizationId}:${resource}:${periodKey}`;

                // Check Redis value
                const redisVal = await this.cacheManager.get<number>(cacheKey);

                // If Redis is missing or different, update it to match DB (Source of Truth)
                // Note: In a high-velocity write environment, Redis might be slightly ahead of DB.
                // But this runs at 2AM when load is lower, and we trust DB as final persistence.
                // If Redis is significantly higher, it might mean queued writes not yet persisted?
                // No, we write to Redis then DB. If Redis > DB, it might mean DB failed.
                // So setting Redis = DB is safer to correct "ghost" usage.

                if (redisVal === undefined || Number(redisVal) !== dbCount) {
                    await this.cacheManager.set(cacheKey, dbCount, 24 * 3600 * 1000); // 24h TTL
                    reconciledCount++;
                }

                // Also update the "plan_limit_check" cache boolean
                // This forces a re-evaluation on next request if the status changed
                 const versionKey = `org_limit_version:${organizationId}`;
                 const version = await this.cacheManager.get<number>(versionKey) || 0;
                 const checkCacheKey = `plan_limit_check:${organizationId}:${version}:${resource}`;
                 await this.cacheManager.del(checkCacheKey);

            } catch (e) {
                this.logger.error(`Failed to reconcile metric ${metric.id}: ${e.message}`);
            }
        }

        skip += BATCH_SIZE;
        // Small delay to prevent CPU choking
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.logger.log(`SaaS Reconciliation Complete. Reconciled ${reconciledCount} counters.`);
  }
}
