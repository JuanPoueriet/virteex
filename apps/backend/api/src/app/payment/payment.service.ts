import { Injectable, Logger, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Organization } from '../organizations/entities/organization.entity';
import { SaasService } from '../saas/saas.service';
import { SAAS_CONFIG } from '../saas/saas.config';
import { WebhookEvent } from './entities/webhook-event.entity';
import { PaymentGateway } from './interfaces/payment-gateway.interface';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(WebhookEvent)
    private webhookEventRepository: Repository<WebhookEvent>,
    
    private saasService: SaasService,
    
    private dataSource: DataSource,
    @Inject('PAYMENT_GATEWAY') private paymentGateway: PaymentGateway
  ) {}

  async createCheckoutSession(organizationId: string, userEmail: string, priceId: string, successUrl: string, cancelUrl: string) {
    return this.paymentGateway.createCheckoutSession({
        organizationId,
        userEmail,
        priceId,
        successUrl,
        cancelUrl
    });
  }

  async getDefaultPaymentMethod(organizationId: string) {
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org || !org.externalCustomerId) {
      return null;
    }
    return this.paymentGateway.getDefaultPaymentMethod(org.externalCustomerId);
  }

  async getInvoices(organizationId: string) {
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org || !org.externalCustomerId) {
      return [];
    }
    return this.paymentGateway.getInvoices(org.externalCustomerId);
  }

  async createPortalSession(organizationId: string, returnUrl: string) {
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org || !org.externalCustomerId) {
      throw new BadRequestException('Organization does not have a customer in payment gateway');
    }
    return this.paymentGateway.createPortalSession(org.externalCustomerId, returnUrl);
  }

  async handleWebhook(signature: string, payload: Buffer) {
    // Ahora está completamente abstraído. La implementación del Gateway maneja la lógica específica.
    return this.paymentGateway.handleWebhook(payload, signature);
  }
}