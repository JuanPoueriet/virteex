import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Organization } from '../organizations/entities/organization.entity';

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
        this.stripe = new Stripe(secretKey, {
            apiVersion: '2025-01-27.acacia',
        });
    } else {
        this.logger.warn('STRIPE_SECRET_KEY not set. Payment service will not work.');
    }
  }

  async createCheckoutSession(organizationId: string, userEmail: string, priceId: string, successUrl: string, cancelUrl: string) {
    if (!this.stripe) {
        throw new BadRequestException('Stripe is not configured.');
    }

    const organization = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    let customerId = organization.stripeCustomerId;

    // Create customer if not exists
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: userEmail,
        name: organization.legalName,
        metadata: {
          organizationId: organization.id,
        },
      });
      customerId = customer.id;

      organization.stripeCustomerId = customerId;
      await this.organizationRepository.save(organization);
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          organizationId: organization.id,
        },
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  async handleWebhook(signature: string, payload: Buffer) {
    if (!this.stripe) return;
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Webhook signature verification failed');
    }

    this.logger.log(`Received Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutSessionCompleted(session);
        break;
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdated(subscription);
        break;
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    // Retrieve subscription ID
    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    // Find organization by customerId
    const organization = await this.organizationRepository.findOne({ where: { stripeCustomerId: customerId } });

    if (organization) {
        organization.stripeSubscriptionId = subscriptionId;
        organization.subscriptionStatus = 'active'; // Assume active on success
        await this.organizationRepository.save(organization);
        this.logger.log(`Updated organization ${organization.id} with subscription ${subscriptionId}`);
    } else {
        this.logger.error(`Organization not found for customer ${customerId}`);
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const organization = await this.organizationRepository.findOne({ where: { stripeSubscriptionId: subscription.id } });

    if (organization) {
        organization.subscriptionStatus = subscription.status;
        await this.organizationRepository.save(organization);
        this.logger.log(`Updated organization ${organization.id} subscription status to ${subscription.status}`);
    }
  }
}
