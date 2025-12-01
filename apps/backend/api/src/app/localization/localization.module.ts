
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { LocalizationService } from './services/localization.service';
import { LocalizationAdminController } from './controllers/localization-admin.controller';
import { FiscalRegion } from './entities/fiscal-region.entity';
import { TaxScheme } from './entities/tax-scheme.entity';
import { ChartOfAccountsModule } from '../chart-of-accounts/chart-of-accounts.module';
import { TaxesModule } from '../taxes/taxes.module';
import { LocalizationTemplate } from './entities/localization-template.entity';
import { CoaTemplate } from './entities/coa-template.entity';
import { TaxTemplate } from './entities/tax-template.entity';
import { LocalizationConsumer } from './consumers/localization.consumer';
import { SharedModule } from '../shared/shared.module';
import { TaxGroup } from './entities/tax-group.entity';
import { ReportDefinition } from './entities/report-definition.entity';
import { EInvoiceProviderConfig } from './entities/einvoice-provider-config.entity';
import { LocalizationController } from './controllers/localization.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FiscalRegion,
      TaxScheme,
      LocalizationTemplate,
      CoaTemplate,
      TaxTemplate,
      TaxGroup,
      ReportDefinition,
      EInvoiceProviderConfig,
    ]),
    BullModule.registerQueue({
      name: 'localization',
    }),
    forwardRef(() => ChartOfAccountsModule),
    TaxesModule,
    SharedModule,
  ],
  providers: [LocalizationService, LocalizationConsumer],
  controllers: [LocalizationAdminController, LocalizationController],
  exports: [LocalizationService],
})
export class LocalizationModule {}