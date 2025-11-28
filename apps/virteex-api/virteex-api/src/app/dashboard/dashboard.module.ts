
import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { ChartOfAccountsModule } from 'src/chart-of-accounts/chart-of-accounts.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { AuthModule } from 'src/auth/auth.module';
import { CacheModule } from '@nestjs/cache-manager';

import { FinancialReportingModule } from 'src/financial-reporting/financial-reporting.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';

@Module({
  imports: [
    CacheModule.register(),
    AuthModule,
    ChartOfAccountsModule,
    InventoryModule,
    FinancialReportingModule,
    TypeOrmModule.forFeature([Organization]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}