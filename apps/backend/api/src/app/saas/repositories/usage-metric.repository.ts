import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SaasResource } from '../enums/saas-resource.enum';
import { UsageMetric } from '../entities/usage-metric.entity';

@Injectable()
export class UsageMetricRepository {
  private readonly logger = new Logger(UsageMetricRepository.name);

  /**
   * Atomically increments usage count.
   * Abstracts the database-specific SQL (PostgreSQL) from the service layer.
   */
  async incrementUsage(
    manager: EntityManager,
    organizationId: string,
    resource: SaasResource,
    periodKey: string,
    increment: number,
    limit: number,
    allowOverage: boolean
  ): Promise<{ count: number; limitReached: boolean }> {
    // 1. Construct Query
    let updateQuery = `
         UPDATE saas_usage_metrics
         SET count = count + $1, updated_at = NOW()
         WHERE organization_id = $2 AND resource = $3 AND period = $4
    `;

    const params = [increment, organizationId, resource, periodKey];

    if (!allowOverage && limit !== -1) {
        updateQuery += ` AND count + $1 <= $5`;
        params.push(limit);
    }

    updateQuery += ` RETURNING count`;

    // 2. Try Update (Optimistic Locking)
    const updateResult = await manager.query(updateQuery, params);

    if (updateResult[0]) {
        return { count: updateResult[0].count, limitReached: false };
    }

    // 3. If Update failed, Try Insert (Upsert equivalent)
    try {
        const insertQuery = `
            INSERT INTO saas_usage_metrics (organization_id, resource, period, count, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING count
        `;
        // Insert params: orgId, resource, period, increment
        // Note: Params array needs to match placeholders.
        // We reused params array above which might have 5 elements.
        // Let's be explicit.
        const insertParams = [organizationId, resource, periodKey, increment];

        const insertResult = await manager.query(insertQuery, insertParams);

        // Check immediate limit violation on insert (e.g. if increment > limit)
        if (!allowOverage && limit !== -1 && insertResult[0].count > limit) {
             // This effectively rolls back because we throw, and caller should be in transaction
             return { count: insertResult[0].count, limitReached: true };
        }

        return { count: insertResult[0].count, limitReached: false };

    } catch (err: any) {
        // 4. Handle Race Condition (Unique Violation 23505)
        if (err.code === '23505') {
            // Row was inserted concurrently. Retry Update.
            const retryResult = await manager.query(updateQuery, params);

            if (retryResult[0]) {
                return { count: retryResult[0].count, limitReached: false };
            }

            // If retry fails and we don't allow overage, it means limit is reached
            if (!allowOverage && limit !== -1) {
                return { count: -1, limitReached: true };
            }
        }
        throw err;
    }
  }

  async findOne(manager: EntityManager, organizationId: string, resource: SaasResource, period: string): Promise<UsageMetric | null> {
      return manager.findOne(UsageMetric, {
          where: { organizationId, resource, period }
      });
  }
}
