import { RegistrationService } from './registration.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { RolesService } from './roles.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { SecurityAnalysisService } from './security-analysis.service';
import { MfaOrchestratorService } from './mfa-orchestrator.service';
import { PasswordService } from './password.service';
import { UserCacheService } from './user-cache.service';
import { GeoService } from './geo.service';
import { CryptoUtil } from './crypto.util';

import { User } from './user.entity';
import { UserSecurity } from './user-security.entity';
import { Role } from './role.entity';
import { Passkey } from './passkey.entity';
import { RefreshToken } from './refresh-token.entity';
import { VerificationCode } from './verification-code.entity';

import { IdentityMailAdapter, IdentityAuditAdapter, IdentitySaasAdapter } from './identity.adapters';
import { AuthController } from './auth.controller';
import { UsersController } from './users.controller';

import * as constants from './identity.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserSecurity, Role, Passkey, RefreshToken, VerificationCode]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET') || 'secret',
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    { provide: constants.AUTH_SERVICE_TOKEN, useClass: AuthService },
    { provide: constants.USERS_SERVICE_TOKEN, useClass: UsersService },
    { provide: constants.ROLES_SERVICE_TOKEN, useClass: RolesService },
    { provide: constants.TOKEN_SERVICE_TOKEN, useClass: TokenService },
    { provide: constants.SESSION_SERVICE_TOKEN, useClass: SessionService },
    { provide: constants.SECURITY_ANALYSIS_SERVICE_TOKEN, useClass: SecurityAnalysisService },
    { provide: constants.MFA_ORCHESTRATOR_SERVICE_TOKEN, useClass: MfaOrchestratorService },
    { provide: constants.PASSWORD_SERVICE_TOKEN, useClass: PasswordService },
    { provide: constants.USER_CACHE_SERVICE_TOKEN, useClass: UserCacheService },
    { provide: constants.GEO_SERVICE_TOKEN, useClass: GeoService },
    RegistrationService,
    { provide: constants.CRYPTO_UTIL_TOKEN, useClass: CryptoUtil },
    { provide: 'MailNotifier', useClass: IdentityMailAdapter },
    { provide: 'AuditPublisher', useClass: IdentityAuditAdapter },
    { provide: 'SaasPlanReader', useClass: IdentitySaasAdapter },
  ],
  exports: [
    constants.AUTH_SERVICE_TOKEN,
    constants.USERS_SERVICE_TOKEN,
  ],
})
export class IdentityModule {}
