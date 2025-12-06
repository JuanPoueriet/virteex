import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './entities/plan.entity';
import { PlanLimit } from './entities/plan-limit.entity';
import { UsageMetric } from './entities/usage-metric.entity';
import { SaasService } from './saas.service';
import { SaasController } from './saas.controller';
import { Organization } from '../organizations/entities/organization.entity';
import { SubscriptionActiveGuard } from './guards/subscription-active.guard';
import { PlanLimitGuard } from './guards/plan-limit.guard';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { UsageMetricRepository } from './repositories/usage-metric.repository';
import { OrganizationSubscriptionHistory } from '../organizations/entities/organization-subscription-history.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, PlanLimit, Organization, UsageMetric, OrganizationSubscriptionHistory]),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST');
        if (redisHost) {
          return {
            store: redisStore as unknown as CacheStore,
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
  ],
  controllers: [SaasController],
  providers: [SaasService, SubscriptionActiveGuard, PlanLimitGuard, UsageMetricRepository],
  exports: [SaasService, SubscriptionActiveGuard, PlanLimitGuard],
})
export class SaasModule {}
