
export class CreateCheckoutSessionDto {
  organizationId: string;
  userEmail: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

export class CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export class WebhookResult {
    processed: boolean;
    eventId: string;
    type: string;
}

export abstract class PaymentGateway {
  abstract createCheckoutSession(dto: CreateCheckoutSessionDto): Promise<CheckoutSessionResult>;
  abstract handleWebhook(payload: Buffer, signature: string): Promise<WebhookResult>;
}
