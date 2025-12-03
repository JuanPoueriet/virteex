import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Organization } from '../organizations/entities/organization.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Organization]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
