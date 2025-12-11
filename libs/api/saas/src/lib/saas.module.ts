import { Module, Global, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from '@virteex/api/data-access-models';
import { PlanLimit } from '@virteex/api/data-access-models';
import { UsageMetric } from '@virteex/api/data-access-models';
import { PlanFeature } from '@virteex/api/data-access-models';
import { SaasService } from './saas.service';
import { SaasController } from './saas.controller';
import { Organization } from '@virteex/api/organizations';
import { SubscriptionActiveGuard } from './guards/subscription-active.guard';
import { PlanLimitCheckGuard } from './guards/plan-limit-check.guard';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { RedisClientOptions } from 'redis';
import { UsageMetricRepository } from './repositories/usage-metric.repository';
import { OrganizationSubscriptionHistory } from '@virteex/api/data-access-models';
import { MetricsModule } from '@virteex/api/metrics';
import { SaasCronService } from './services/saas-cron.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, PlanLimit, PlanFeature, Organization, UsageMetric, OrganizationSubscriptionHistory]),
    MetricsModule,
    CacheModule.registerAsync<RedisClientOptions>({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST');
        if (redisHost) {
          return {
            store: redisStore,
            host: redisHost,
            port: configService.get<number>('REDIS_PORT', 6379),
            ttl: 60 * 5, // Default 5 mins
          };
        }
        return {
           ttl: 60 * 5,
        };
      },
    })
  ],
  controllers: [SaasController],
  providers: [SaasService, SubscriptionActiveGuard, PlanLimitCheckGuard, UsageMetricRepository, SaasCronService],
  exports: [SaasService, SubscriptionActiveGuard, PlanLimitCheckGuard],
})
export class SaasModule {}
