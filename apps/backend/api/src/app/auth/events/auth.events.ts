
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditTrailService } from '../../audit/audit.service';
import { ActionType } from '../../audit/entities/audit-log.entity';

export enum AuthEvents {
    LOGIN_SUCCESS = 'auth.login.success',
    LOGIN_FAILED = 'auth.login.failed',
    IMPERSONATE = 'auth.impersonate',
    LOGOUT = 'auth.logout',
    TWO_FACTOR_ENABLED = 'auth.2fa.enabled',
    TWO_FACTOR_DISABLED = 'auth.2fa.disabled',
}

export class AuthLoginSuccessEvent {
    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly ipAddress?: string,
        public readonly userAgent?: string
    ) {}
}

export class AuthLoginFailedEvent {
    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly reason: string,
        public readonly ipAddress?: string,
        public readonly userAgent?: string
    ) {}
}

export class AuthImpersonateEvent {
    constructor(
        public readonly adminId: string,
        public readonly targetUserId: string,
        public readonly adminEmail: string,
        public readonly targetUserEmail: string
    ) {}
}

@Injectable()
export class AuthSubscriber {
    private readonly logger = new Logger(AuthSubscriber.name);

    constructor(private readonly auditService: AuditTrailService) {}

    @OnEvent(AuthEvents.LOGIN_SUCCESS)
    async handleLoginSuccess(payload: AuthLoginSuccessEvent) {
        await this.auditService.record(
            payload.userId,
            'User',
            payload.userId,
            ActionType.LOGIN,
            { email: payload.email, ipAddress: payload.ipAddress, userAgent: payload.userAgent },
            undefined
        );
        this.logger.log(`User ${payload.email} logged in from ${payload.ipAddress}`);
    }

    @OnEvent(AuthEvents.LOGIN_FAILED)
    async handleLoginFailed(payload: AuthLoginFailedEvent) {
        await this.auditService.record(
            payload.userId,
            'User',
            payload.userId,
            ActionType.LOGIN_FAILED,
            { email: payload.email, reason: payload.reason, ipAddress: payload.ipAddress },
            undefined
        );
        this.logger.warn(`Login failed for ${payload.email}: ${payload.reason}`);
    }

    @OnEvent(AuthEvents.IMPERSONATE)
    async handleImpersonate(payload: AuthImpersonateEvent) {
        await this.auditService.record(
            payload.adminId,
            'User',
            payload.targetUserId,
            ActionType.IMPERSONATE,
            {
                targetUserEmail: payload.targetUserEmail,
                adminEmail: payload.adminEmail
            },
            undefined
        );
    }
}
