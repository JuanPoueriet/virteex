
export interface MailNotifier {
    sendPasswordResetEmail(user: any, token: string, expiresIn: string): Promise<void>;
    sendUserInvitation(user: any, token: string): Promise<void>;
}

export interface AuditPublisher {
    publish(event: string, payload: any): Promise<void>;
}

export interface OrganizationReader {
    findOne(id: string): Promise<any>;
}

export interface SaasPlanReader {
    enforceLimit(organizationId: string, resource: string, manager?: any): Promise<void>;
}

export interface OrganizationView {
    id: string;
    legalName: string;
}

export interface SaasPlanView {
    id: string;
    name: string;
}
