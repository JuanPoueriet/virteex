import { Injectable, Logger } from '@nestjs/common';
import { MailNotifier, AuditPublisher, SaasPlanReader } from './external-ports';

@Injectable()
export class IdentityMailAdapter implements MailNotifier {
    private readonly logger = new Logger(IdentityMailAdapter.name);
    async sendPasswordResetEmail(user: any, token: string, expiresIn: string): Promise<void> {
        this.logger.log(`Sending password reset email to ${user.email} (adapter stub)`);
    }
    async sendUserInvitation(user: any, token: string): Promise<void> {
        this.logger.log(`Sending invitation email to ${user.email} (adapter stub)`);
    }
}

@Injectable()
export class IdentityAuditAdapter implements AuditPublisher {
    private readonly logger = new Logger(IdentityAuditAdapter.name);
    async publish(event: string, payload: any): Promise<void> {
        this.logger.log(`Publishing audit event: ${event} (adapter stub)`);
    }
}

@Injectable()
export class IdentitySaasAdapter implements SaasPlanReader {
    private readonly logger = new Logger(IdentitySaasAdapter.name);
    async enforceLimit(organizationId: string, resource: string, manager?: any): Promise<void> {
        this.logger.log(`Enforcing limit for ${resource} in org ${organizationId} (adapter stub)`);
    }
}
