
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccountSegmentsService } from '../account-segments.service';

@Injectable()
export class ChartOfAccountsLifecycleListener {
  private readonly logger = new Logger(ChartOfAccountsLifecycleListener.name);

  constructor(private readonly segmentsService: AccountSegmentsService) {}

  @OnEvent('organization.created')
  async handleOrganizationCreated(payload: { organizationId: string }) {
    this.logger.log(`Initializing segment definitions for organization: ${payload.organizationId}`);

    try {
      const defaults = {
        segments: [
          { name: 'Nivel 1', length: 1, isRequired: true },
          { name: 'Nivel 2', length: 2, isRequired: true },
          { name: 'Nivel 3', length: 2, isRequired: true },
          { name: 'Nivel 4', length: 3, isRequired: true },
        ]
      };

      await this.segmentsService.configure(defaults, payload.organizationId);
      this.logger.log(`Default segment definitions initialized for organization: ${payload.organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to initialize segment definitions for organization: ${payload.organizationId}`, error.stack);
    }
  }
}
