
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialReportingController } from './financial-reporting.controller';
import { FinancialReportingService } from './financial-reporting.service';

import { Account } from 'src/chart-of-accounts/entities/account.entity';
import { JournalEntryLine } from 'src/journal-entries/entities/journal-entry-line.entity';
import { OrganizationSettings } from 'src/organizations/entities/organization-settings.entity';
import { Invoice } from 'src/invoices/entities/invoice.entity';
import { MonthlyAccountBalance } from 'src/reporting/entities/monthly-account-balance.entity';

@Module({
  imports: [

    TypeOrmModule.forFeature([
      Account,
      JournalEntryLine,
      OrganizationSettings,
      Invoice,
      MonthlyAccountBalance,
    ]),
  ],
  controllers: [FinancialReportingController],
  providers: [FinancialReportingService],

  exports: [FinancialReportingService],
})
export class FinancialReportingModule {}