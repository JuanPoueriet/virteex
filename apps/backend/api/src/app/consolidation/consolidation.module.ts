
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsolidationService } from './consolidation.service';
import { ConsolidationController } from './consolidation.controller';
import { Organization } from '@virteex/api/data-access-models';
import { OrganizationSubsidiary } from '@virteex/api/data-access-models';
import { FinancialReportingModule } from '../financial-reporting/financial-reporting.module';
import { AuthModule } from '../auth/auth.module';
import { ConsolidationMap } from './entities/consolidation-map.entity';


import { OrganizationSettings } from '@virteex/api/data-access-models';
import { ExchangeRate } from '../currencies/entities/exchange-rate.entity';
import { ConsolidationMappingController } from './consolidation-mapping.controller';
import { ConsolidationMappingService } from './consolidation-mapping.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationSubsidiary,
      ConsolidationMap,


      OrganizationSettings,
      ExchangeRate,

    ]),
    FinancialReportingModule,
    AuthModule,
  ],

  providers: [ConsolidationService, ConsolidationMappingService],
  controllers: [ConsolidationController, ConsolidationMappingController],
})
export class ConsolidationModule {}