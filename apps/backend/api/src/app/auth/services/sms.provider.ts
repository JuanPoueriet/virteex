import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio'; // [!code change] 1. Importa la clase Twilio específicamente
import { AuthConfig } from '../auth.config';

export interface SmsProvider {
  send(to: string, body: string): Promise<void>;
}

@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  private readonly client: Twilio; // [!code change] 2. Usa 'Twilio' como tipo (la clase)
  private readonly logger = new Logger(TwilioSmsProvider.name);

  constructor() {
    // If credentials are missing, we might want to throw or log a warning.
    // For now, we assume they are provided as per requirement.
    if (AuthConfig.TWILIO_ACCOUNT_SID && AuthConfig.TWILIO_AUTH_TOKEN) {
        // [!code change] 3. IMPORTANTE: Agrega 'new' antes de Twilio
        this.client = new Twilio(AuthConfig.TWILIO_ACCOUNT_SID, AuthConfig.TWILIO_AUTH_TOKEN);
    } else {
        this.logger.warn('Twilio credentials not found. SMS will not be sent.');
    }
  }

  async send(to: string, body: string): Promise<void> {
    if (!this.client) {
        this.logger.warn(`Twilio client not initialized. Skipped sending SMS to ${to}`);
        return;
    }

    try {
      await this.client.messages.create({
        body,
        from: AuthConfig.TWILIO_PHONE_NUMBER,
        to,
      });
      this.logger.log(`SMS sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}: ${(error as Error).message}`);
      throw error;
    }
  }
}