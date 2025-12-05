
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { GoogleRecaptchaModule, GoogleRecaptchaGuard } from '@nestlab/google-recaptcha';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegistrationService } from './services/registration.service';
import { TwoFactorAuthService } from './services/two-factor-auth.service';
import { PasswordRecoveryService } from './services/password-recovery.service';
import { WebAuthnService } from './services/webauthn.service';
import { ImpersonationService } from './services/impersonation.service';
import { JwtStrategy } from './strategies/jwt.strategy/jwt.strategy';
import { UserCacheService } from './services/user-cache.service';
import { CookieService } from './services/cookie.service';
import { SessionService } from './services/session.service';
import { SecurityAnalysisService } from './services/security-analysis.service';
import { TokenService } from './services/token.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { OktaStrategy } from './strategies/okta.strategy';

import { RefreshToken } from './entities/refresh-token.entity';
import { VerificationCode } from './entities/verification-code.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity/user.entity';
import { Passkey } from '../users/entities/passkey.entity';
import { MailModule } from '../mail/mail.module';
import { LocalizationModule } from '../localization/localization.module';
import { AuditModule } from '../audit/audit.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { GeoModule } from '../geo/geo.module';
import { UsersModule } from '../users/users.module';
import { TwilioSmsProvider } from './services/sms.provider';
import { AbstractSmsProvider } from './services/abstract-sms.provider';
import { SocialAuthService } from './services/social-auth.service';
import { MfaOrchestratorService } from './services/mfa-orchestrator.service';

@Module({
  imports: [
    ConfigModule,
    AuditModule,
    OrganizationsModule,
    GeoModule,
    forwardRef(() => UsersModule), // Import UsersModule to use UsersService
    // Cache configuration: Redis if available, Memory fallback
    CacheModule.registerAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => {
            const redisHost = configService.get<string>('REDIS_HOST');
            if (redisHost) {
                return {
                    store: redisStore,
                    host: redisHost,
                    port: configService.get<number>('REDIS_PORT', 6379),
                    ttl: 600,
                };
            }
            return {
                ttl: 600,
            };
        },
    }),
    TypeOrmModule.forFeature([RefreshToken, Organization, VerificationCode, User, Passkey]), // Added User and Passkey
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRATION_TIME', '1h'),
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => {
        const redisHost = config.get<string>('REDIS_HOST');
        const storage = redisHost
          ? new ThrottlerStorageRedisService({
              host: redisHost,
              port: config.get<number>('REDIS_PORT', 6379),
            })
          : undefined;

        return {
          throttlers: [
            {
              ttl: Number(config.get('THROTTLE_TTL', 60000)),
              limit: Number(config.get('THROTTLE_LIMIT', 10)),
            },
          ],
          storage,
        };
      },
    }),
    GoogleRecaptchaModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secretKey: config.get<string>('RECAPTCHA_SECRET_KEY'),
        response: (req) => req.body.recaptchaToken,
      }),
    }),
    MailModule,
    LocalizationModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RegistrationService,
    TwoFactorAuthService,
    PasswordRecoveryService,
    WebAuthnService,
    ImpersonationService,
    JwtStrategy,
    UserCacheService,
    CookieService,
    SessionService,
    SecurityAnalysisService,
    TokenService,
    GoogleRecaptchaGuard,
    GoogleStrategy,
    MicrosoftStrategy,
    OktaStrategy,
    SocialAuthService,
    MfaOrchestratorService,
    {
      provide: AbstractSmsProvider,
      useClass: TwilioSmsProvider
    }
  ],
  exports: [
    AuthService,
    TwoFactorAuthService,
    PasswordRecoveryService,
    WebAuthnService,
    ImpersonationService,
    PassportModule,
    JwtModule,
    JwtStrategy,
    CookieService,
    UserCacheService,
    SocialAuthService,
    MfaOrchestratorService
  ],
})
export class AuthModule {}
