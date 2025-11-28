

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { GoogleRecaptchaModule, GoogleRecaptchaGuard } from '@nestlab/google-recaptcha';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy/jwt.strategy';


import { User } from '../users/entities/user.entity/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { MailModule } from '../mail/mail.module';
import { LocalizationModule } from '../localization/localization.module';

@Module({
  imports: [
    ConfigModule,

    TypeOrmModule.forFeature([User, Organization]),
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
      useFactory: (config: ConfigService): ThrottlerModuleOptions => ({
        throttlers: [
          {
            ttl: Number(config.get('THROTTLE_TTL', 60)),
            limit: Number(config.get('THROTTLE_LIMIT', 10)),
          },
        ],
      }),
    }),
    GoogleRecaptchaModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secretKey: config.get<string>('RECAPTCHA_SECRET_KEY'),
        response: () => config.get<string>('RECAPTCHA_RESPONSE', 'g-recaptcha-response'),
      }),
    }),
    MailModule,
    LocalizationModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleRecaptchaGuard],
  exports: [AuthService, PassportModule, JwtModule, JwtStrategy],
})
export class AuthModule {}