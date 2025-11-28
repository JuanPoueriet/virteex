
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsPayableService } from './accounts-payable.service';
import { AccountsPayableController } from './accounts-payable.controller';
import { VendorBill } from './entities/vendor-bill.entity';
import { VendorBillLine } from './entities/vendor-bill-line.entity';
import { VendorPayment } from './entities/vendor-payment.entity';
import { VendorDebitNote } from './entities/vendor-debit-note.entity';
import { PaymentBatch } from './entities/payment-batch.entity';
import { OrganizationSettings } from 'src/organizations/entities/organization-settings.entity';
import { JournalEntriesModule } from 'src/journal-entries/journal-entries.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { WorkflowsModule } from 'src/workflows/workflows.module';
import { ExchangeRate } from 'src/currencies/entities/exchange-rate.entity';
import { CurrenciesModule } from 'src/currencies/currencies.module';
import { BudgetsModule } from 'src/budgets/budgets.module';
import { VendorDebitNotesController } from './vendor-debit-notes.controller';
import { VendorDebitNotesService } from './vendor-debit-notes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VendorBill,
      VendorBillLine,
      VendorPayment,
      VendorDebitNote,
      PaymentBatch,
      OrganizationSettings,
      ExchangeRate,
    ]),
    JournalEntriesModule,
    InventoryModule,
    WorkflowsModule,
    CurrenciesModule,
    BudgetsModule,
  ],
  controllers: [AccountsPayableController, VendorDebitNotesController],
  providers: [AccountsPayableService, VendorDebitNotesService],
})
export class AccountsPayableModule {}