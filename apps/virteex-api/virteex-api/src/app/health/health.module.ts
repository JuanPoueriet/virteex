
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ChartOfAccountsModule } from 'src/chart-of-accounts/chart-of-accounts.module';

@Module({
  imports: [ChartOfAccountsModule],
  controllers: [HealthController],
})
export class HealthModule {}