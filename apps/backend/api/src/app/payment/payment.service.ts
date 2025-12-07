import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Stripe from 'stripe';
import { Organization } from '../organizations/entities/organization.entity';
import { SaasService } from '../saas/saas.service';
import { STRIPE_CLIENT } from './stripe/stripe.provider';
import { WebhookEvent } from './entities/webhook-event.entity';

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
    @Inject(STRIPE_CLIENT) private stripe: Stripe
  ) {}

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

    // Embed internal plan slug in metadata if possible, but priceId is passed by client.
    // Client should send priceId, we can find the plan and put its slug in metadata.
    const plans = await this.saasService.getPlans();
    const plan = plans.find(p => p.monthlyPriceId === priceId || p.annualPriceId === priceId);
    const planSlug = plan ? plan.slug : 'unknown';

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
          planSlug: planSlug
        },
      },
      metadata: {
          organizationId: organization.id,
          planSlug: planSlug
      }
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

    // Process safely inside a transaction to ensure idempotency and atomicity
    await this.dataSource.transaction(async (manager) => {
        // Idempotency check with locking?
        // Or just normal check. Since we are inside transaction, if we select for update?
        // WebhookEvent doesn't exist yet, so we can't lock it.
        // But we can check existence.
        // If two requests come same time:
        // T1: Check exists -> No.
        // T2: Check exists -> No.
        // T1: Do work. Insert Event. Commit.
        // T2: Do work. Insert Event. Commit -> Fail Unique Constraint (PK).

        // So relying on PK uniqueness of WebhookEvent is enough for "At Most Once".
        // But if T2 fails on insert, T2 rolls back work? Yes!
        // So we are safe.

        const existingEvent = await manager.findOne(WebhookEvent, { where: { id: event.id } });
        if (existingEvent) {
            this.logger.log(`Event ${event.id} already processed. Skipping.`);
            return;
        }

        this.logger.log(`Received Stripe event: ${event.type}`);

        try {
            switch (event.type) {
                case 'checkout.session.completed':
                    const session = event.data.object as Stripe.Checkout.Session;
                    await this.handleCheckoutSessionCompleted(session, manager);
                    break;
                case 'customer.subscription.deleted':
                case 'customer.subscription.updated':
                    const subscription = event.data.object as Stripe.Subscription;
                    await this.handleSubscriptionUpdated(subscription, manager);
                    break;
                default:
                    this.logger.log(`Unhandled event type: ${event.type}`);
            }

            // Save processed event
            await manager.save(WebhookEvent, { id: event.id });

        } catch (error) {
            this.logger.error(`Error processing event ${event.id}: ${error.message}`);
            // If we throw here, transaction aborts.
            // If transient error, good.
            // If logic error, maybe we should catch and log?
            // But if we catch, we might save the event as "Processed" even if it failed?
            // Ideally, we only mark as processed if success.
            // So re-throw is correct for 10/10 consistency.
            throw error;
        }
    });
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, manager: any) {
    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;
    // Metadata is safer than Price ID matching
    const metadata = session.metadata || {};
    const planSlug = metadata.planSlug;

    const organization = await manager.findOne(Organization, { where: { stripeCustomerId: customerId } });

    if (organization) {
        organization.stripeSubscriptionId = subscriptionId;
        organization.subscriptionStatus = 'active';

        if (planSlug) {
            const plan = await this.saasService.getPlanBySlug(planSlug);
            if (plan) {
                organization.plan = plan;
            } else {
                this.logger.warn(`Plan slug ${planSlug} from metadata not found.`);
            }
        } else {
            // Fallback to price matching if metadata missing
             try {
                const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
                const priceId = sub.items.data[0]?.price.id;
                if (priceId) {
                    const plans = await this.saasService.getPlans();
                    const matchedPlan = plans.find(p => p.monthlyPriceId === priceId || p.annualPriceId === priceId);
                    if (matchedPlan) {
                        organization.plan = matchedPlan;
                    }
                }
            } catch (e) {
                this.logger.error(`Failed to sync plan for org ${organization.id}: ${e.message}`);
            }
        }

        await manager.save(organization);
        this.logger.log(`Updated organization ${organization.id} with subscription ${subscriptionId}`);
    } else {
        this.logger.error(`Organization not found for customer ${customerId}`);
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription, manager: any) {
    const organization = await manager.findOne(Organization, { where: { stripeSubscriptionId: subscription.id } });

    if (organization) {
        // Grace Period Logic:
        // If status is 'past_due', we set a custom grace period end date (e.g. +5 days).
        // If status recovers to 'active', we clear the grace period.

        organization.subscriptionStatus = subscription.status;
        organization.subscriptionPeriodEnd = new Date(subscription.current_period_end * 1000);

        if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
             const GRACE_PERIOD_DAYS = 5;
             const graceEnd = new Date();
             graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);
             organization.gracePeriodEnd = graceEnd;

             this.logger.warn(`Organization ${organization.id} subscription is ${subscription.status}. Grace period set until ${graceEnd.toISOString()}.`);
        } else if (subscription.status === 'active') {
             organization.gracePeriodEnd = null;
        }

        await manager.save(organization);
        this.logger.log(`Updated organization ${organization.id} subscription status to ${subscription.status}`);
    }
  }
}
