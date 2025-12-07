import { Module, Global, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './entities/plan.entity';
import { PlanLimit } from './entities/plan-limit.entity';
import { UsageMetric } from './entities/usage-metric.entity';
import { PlanFeature } from './entities/plan-feature.entity';
import { SaasService } from './saas.service';
import { SaasController } from './saas.controller';
import { Organization } from '../organizations/entities/organization.entity';
import { SubscriptionActiveGuard } from './guards/subscription-active.guard';
import { PlanLimitCheckGuard } from './guards/plan-limit-check.guard';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { UsageMetricRepository } from './repositories/usage-metric.repository';
import { OrganizationSubscriptionHistory } from '../organizations/entities/organization-subscription-history.entity';
import { MetricsModule } from '../metrics/metrics.module';
import { PaymentModule } from '../payment/payment.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, PlanLimit, PlanFeature, Organization, UsageMetric, OrganizationSubscriptionHistory]),
    MetricsModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST');
        if (redisHost) {
          return {
            store: redisStore as any,
            host: redisHost,
            port: configService.get<number>('REDIS_PORT', 6379),
            ttl: 60 * 5, // Default 5 mins
          };
        }
        return {
           ttl: 60 * 5,
        };
      },
    }),
    forwardRef(() => PaymentModule)
  ],
  controllers: [SaasController],
  providers: [SaasService, SubscriptionActiveGuard, PlanLimitCheckGuard, UsageMetricRepository],
  exports: [SaasService, SubscriptionActiveGuard, PlanLimitCheckGuard],
})
export class SaasModule {}
