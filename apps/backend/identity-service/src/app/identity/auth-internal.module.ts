import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { SecurityAnalysisService } from './security-analysis.service';
import { MfaOrchestratorService } from './mfa-orchestrator.service';
import { UsersInternalModule } from './users-internal.module';
import { EventsGateway } from './events.gateway';
import { AuditTrailService } from './audit.service';
import { CryptoUtil } from './crypto.util';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { AbstractSmsProvider, SmsProviderStub } from './abstract-sms.provider';
import { IdentityAuditAdapter } from './identity.adapters';

@Module({
  imports: [
    forwardRef(() => UsersInternalModule),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET') || 'secret',
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  providers: [
    AuthService,
    TokenService,
    SessionService,
    SecurityAnalysisService,
    MfaOrchestratorService,
    EventsGateway,
    AuditTrailService,
    CryptoUtil,
    TwoFactorAuthService,
    { provide: AbstractSmsProvider, useClass: SmsProviderStub },
    { provide: 'AuditPublisher', useClass: IdentityAuditAdapter },
  ],
  exports: [AuthService, TokenService, SessionService],
})
export class AuthInternalModule {}
