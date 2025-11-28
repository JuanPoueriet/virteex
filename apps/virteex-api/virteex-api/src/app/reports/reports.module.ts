
import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { InvoicesModule } from 'src/invoices/invoices.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from 'src/invoices/entities/invoice.entity';
import { JournalEntryLine } from 'src/journal-entries/entities/journal-entry-line.entity';
import { Account } from 'src/chart-of-accounts/entities/account.entity';
import { Report } from './entities/report.entity';

@Module({
  imports: [
    InvoicesModule,

    TypeOrmModule.forFeature([Invoice, JournalEntryLine, Account, Report]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}