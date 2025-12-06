import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './entities/plan.entity';
import { PlanLimit } from './entities/plan-limit.entity';
import { SaasService } from './saas.service';
import { SaasController } from './saas.controller';
import { Organization } from '../organizations/entities/organization.entity';
import { SubscriptionActiveGuard } from './guards/subscription-active.guard';
import { PlanLimitGuard } from './guards/plan-limit.guard';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, PlanLimit, Organization])
  ],
  controllers: [SaasController],
  providers: [SaasService, SubscriptionActiveGuard, PlanLimitGuard],
  exports: [SaasService, SubscriptionActiveGuard, PlanLimitGuard],
})
export class SaasModule {}
