
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsolidationService } from './consolidation.service';
import { ConsolidationController } from './consolidation.controller';
import { Organization } from 'src/organizations/entities/organization.entity';
import { OrganizationSubsidiary } from 'src/organizations/entities/organization-subsidiary.entity';
import { FinancialReportingModule } from 'src/financial-reporting/financial-reporting.module';
import { AuthModule } from 'src/auth/auth.module';
import { ConsolidationMap } from './entities/consolidation-map.entity';


import { OrganizationSettings } from 'src/organizations/entities/organization-settings.entity';
import { ExchangeRate } from 'src/currencies/entities/exchange-rate.entity';
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