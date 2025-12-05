
import { Module } from '@nestjs/common';
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
import { ImpersonationService } from './services/impersonation.service';
import { JwtStrategy } from './strategies/jwt.strategy/jwt.strategy';
import { UserCacheService } from './services/user-cache.service';
import { CookieService } from './services/cookie.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { OktaStrategy } from './strategies/okta.strategy';

import { User } from '../users/entities/user.entity/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { MailModule } from '../mail/mail.module';
import { LocalizationModule } from '../localization/localization.module';
import { AuditModule } from '../audit/audit.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [
    ConfigModule,
    AuditModule,
    OrganizationsModule,
    GeoModule,
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
    TypeOrmModule.forFeature([User, RefreshToken, Organization]),
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
    ImpersonationService,
    JwtStrategy,
    UserCacheService,
    CookieService,
    GoogleRecaptchaGuard,
    GoogleStrategy,
    MicrosoftStrategy,
    OktaStrategy
  ],
  exports: [
    AuthService,
    TwoFactorAuthService,
    PasswordRecoveryService,
    ImpersonationService,
    PassportModule,
    JwtModule,
    JwtStrategy,
    CookieService,
    UserCacheService
  ],
})
export class AuthModule {}
