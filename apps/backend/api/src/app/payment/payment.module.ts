import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Organization } from '../organizations/entities/organization.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { StripeModule } from './stripe/stripe.module';

@Module({
  imports: [
    ConfigModule,
    StripeModule,
    TypeOrmModule.forFeature([Organization, WebhookEvent]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
