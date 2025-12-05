
import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
  BadRequestException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as ms from 'ms';
import { randomInt } from 'crypto';

import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { SetPasswordFromInvitationDto } from './dto/set-password-from-invitation.dto';
import { User, UserStatus } from '../users/entities/user.entity/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { VerificationCode, VerificationType } from './entities/verification-code.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthConfig } from './auth.config';
import { AuditTrailService } from '../audit/audit.service';
import { ActionType } from '../audit/entities/audit-log.entity';
import { UserCacheService } from './services/user-cache.service';
import { GeoService } from '../geo/geo.service';
import { SocialUser } from './interfaces/social-user.interface';
import { RegistrationService } from './services/registration.service';
import { PasswordRecoveryService } from './services/password-recovery.service';
import { ImpersonationService } from './services/impersonation.service';
import { UsersService } from '../users/users.service';
import { SmsProvider } from './services/sms.provider';
import { SessionService } from './services/session.service';
import { SecurityAnalysisService } from './services/security-analysis.service';
import { TokenService } from './services/token.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(VerificationCode)
    private readonly verificationCodeRepository: Repository<VerificationCode>,
    @Inject('SmsProvider')
    private readonly smsProvider: SmsProvider,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditTrailService,
    private readonly userCacheService: UserCacheService,
    private readonly registrationService: RegistrationService,
    private readonly passwordRecoveryService: PasswordRecoveryService,
    private readonly impersonationService: ImpersonationService,
    private readonly geoService: GeoService,
    private readonly sessionService: SessionService,
    private readonly securityAnalysisService: SecurityAnalysisService,
    private readonly tokenService: TokenService
  ) {}

  async validateOAuthLogin(socialUser: SocialUser, ipAddress?: string, userAgent?: string): Promise<{ user: User | null; tokens?: any }> {
    const user = await this.usersService.findOneByEmail(socialUser.email);

    if (user) {
      if (user.authProvider !== socialUser.provider || user.authProviderId !== socialUser.providerId) {
        await this.usersService.update(user.id, {
          authProvider: socialUser.provider,
          authProviderId: socialUser.providerId,
          avatarUrl: user.avatarUrl || socialUser.picture
        });

        user.authProvider = socialUser.provider;
        user.authProviderId = socialUser.providerId;
      }

       if (user.status !== UserStatus.ACTIVE) {
         throw new UnauthorizedException('Usuario inactivo o bloqueado.');
       }

      await this.securityAnalysisService.checkImpossibleTravel(user.id, ipAddress);

      await this.auditService.record(
        user.id,
        'User',
        user.id,
        ActionType.LOGIN,
        { email: user.email, provider: socialUser.provider, ipAddress, userAgent },
        undefined,
      );

       const authResponse = await this.tokenService.generateAuthResponse(user, {}, ipAddress, userAgent);
       return { user, tokens: authResponse };
    }

    return { user: null };
  }

  async generateRegisterToken(socialUser: SocialUser): Promise<string> {
    return this.jwtService.sign(
      {
        email: socialUser.email,
        firstName: socialUser.firstName,
        lastName: socialUser.lastName,
        provider: socialUser.provider,
        picture: socialUser.picture,
        type: 'social-register'
      },
      {
        secret: this.configService.getOrThrow('JWT_SECRET'),
        expiresIn: '10m'
      }
    );
  }

  async getSocialRegisterInfo(token: string): Promise<SocialUser> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
      });

      if (payload.type !== 'social-register') {
        throw new UnauthorizedException('Token inválido para registro.');
      }

      return {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        provider: payload.provider,
        picture: payload.picture,
        providerId: '',
        accessToken: ''
      };
    } catch (e) {
      throw new UnauthorizedException('Token de registro inválido o expirado.');
    }
  }

  async register(registerUserDto: RegisterUserDto, ipAddress?: string, userAgent?: string) {
    const user = await this.registrationService.register(registerUserDto);
    const authResponse = await this.tokenService.generateAuthResponse(user, {}, ipAddress, userAgent);

    return {
      user: authResponse.user,
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
    };
  }


  async login(loginUserDto: LoginUserDto & { twoFactorCode?: string }, ipAddress?: string, userAgent?: string) {
    const { email, password, twoFactorCode } = loginUserDto;

    const user = await this.usersService.findUserForAuth(email);

    if (user && user.lockoutUntil && new Date() < user.lockoutUntil) {
      const remainingTime = Math.ceil(
        (user.lockoutUntil.getTime() - Date.now()) / (1000 * 60),
      );
      throw new UnauthorizedException(
        `Cuenta bloqueada temporalmente. Intente nuevamente en ${remainingTime} minutos.`,
      );
    }

    let isPasswordValid = false;
    if (user && user.passwordHash) {
        isPasswordValid = await argon2.verify(user.passwordHash, password);
    } else {
        try {
            await argon2.verify(AuthConfig.DUMMY_PASSWORD_HASH, password);
        } catch (e) {}
        isPasswordValid = false;
    }

    if (!user || !isPasswordValid) {
          if (user) {
              await this.handleFailedLoginAttempt(user);
              await this.auditService.record(
                user.id,
                'User',
                user.id,
                ActionType.LOGIN_FAILED,
                { email: user.email, reason: 'Invalid Credentials' },
                undefined
              );
          }
          await this.simulateDelay();
          throw new UnauthorizedException('Credenciales no válidas');
    }

    if (user.status !== UserStatus.ACTIVE) {
       await this.auditService.record(
            user.id,
            'User',
            user.id,
            ActionType.LOGIN_FAILED,
            { email: user.email, reason: 'User Inactive/Blocked' },
            undefined
       );
      throw new UnauthorizedException(
        'Usuario inactivo o pendiente, por favor contacte al administrador.',
      );
    }

    await this.securityAnalysisService.checkImpossibleTravel(user.id, ipAddress);

    if (ipAddress) {
        const location = this.geoService.getLocation(ipAddress);
        if (location && location.country) {
            this.logger.log(`User login from Country: ${location.country} (IP: ${ipAddress})`);
        }
    }

    // 2FA Check
    if (user.isTwoFactorEnabled) {
      if (!twoFactorCode) {
         const tempToken = this.jwtService.sign(
            { id: user.id, type: '2fa_pending', tokenVersion: user.tokenVersion },
            { expiresIn: '5m', secret: this.configService.getOrThrow('JWT_SECRET') }
         );

         if (user.isPhoneVerified && user.phone) {
             await this.sendLoginOtp(user);
         }

         return {
            require2fa: true,
            tempToken,
            message: '2FA verification required'
         };
      }

      const isValid2FA = await this.securityAnalysisService.validateTwoFactorCode(user, twoFactorCode);

      if (!isValid2FA) {
         await this.auditService.record(
            user.id,
            'User',
            user.id,
            ActionType.LOGIN_FAILED,
            { email: user.email, reason: 'Invalid 2FA Code' },
            undefined
         );
         throw new UnauthorizedException('Código 2FA inválido');
      }
    }

    await this.resetLoginAttempts(user);

    await this.auditService.record(
        user.id,
        'User',
        user.id,
        ActionType.LOGIN,
        { email: user.email, ipAddress, userAgent },
        undefined,
    );

    return await this.tokenService.generateAuthResponse(user, {}, ipAddress, userAgent);
  }

  async validate(payload: JwtPayload): Promise<any> {
    let user = await this.userCacheService.getUser(payload.id);

    if (!user) {
      user = await this.usersService.findUserByIdForAuth(payload.id);

      if (user) {
        await this.userCacheService.setUser(payload.id, user, AuthConfig.CACHE_TTL);
      }
    }

    if (!user || user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Token inválido o usuario bloqueado.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Usuario inactivo o pendiente, por favor contacte al administrador.',
      );
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException(
        'La sesión ha expirado. Por favor, inicia sesión de nuevo.',
      );
    }

    const safeUser = this.tokenService.buildSafeUser(user);

    return {
      ...safeUser,
      isImpersonating: payload.isImpersonating,
      originalUserId: payload.originalUserId,
    };
  }

  private async simulateDelay() {
    return new Promise((resolve) => setTimeout(resolve, AuthConfig.SIMULATED_DELAY_MS));
  }

  async setPasswordFromInvitation(
    setPasswordDto: SetPasswordFromInvitationDto,
  ) {
    const user = await this.passwordRecoveryService.setPasswordFromInvitation(setPasswordDto);
    return await this.tokenService.generateAuthResponse(user);
  }

  async refreshAccessToken(token: string, ipAddress?: string, userAgent?: string) {
    return this.sessionService.refreshAccessToken(token, ipAddress, userAgent);
  }

  async status(userFromJwt: any) {
    let freshUser = await this.userCacheService.getUser(userFromJwt.id);

    if (!freshUser) {
        freshUser = await this.usersService.findUserByIdForAuth(userFromJwt.id);

        if (freshUser) {
            await this.userCacheService.setUser(userFromJwt.id, freshUser, AuthConfig.CACHE_TTL);
        }
    }

    if (!freshUser) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const safeUser = this.tokenService.buildSafeUser(freshUser);

    const userWithImpersonationStatus = {
      ...safeUser,
      isImpersonating: userFromJwt.isImpersonating || false,
      originalUserId: userFromJwt.originalUserId || undefined,
    };

    return { user: userWithImpersonationStatus };
  }


  async impersonate(adminUser: User, targetUserId: string) {
    const targetUser = await this.impersonationService.validateImpersonationRequest(adminUser, targetUserId);

    await this.auditService.record(
        adminUser.id,
        'User',
        targetUserId,
        ActionType.IMPERSONATE,
        {
            targetUserEmail: targetUser.email,
            adminEmail: adminUser.email
        },
        undefined
    );

    return await this.tokenService.generateAuthResponse(targetUser, {
      isImpersonating: true,
      originalUserId: adminUser.id,
    });
  }

  async stopImpersonation(impersonatingUser: User) {
    const adminUser = await this.impersonationService.validateStopImpersonation(impersonatingUser);
    return await this.tokenService.generateAuthResponse(adminUser);
  }

  async logout(userId: string) {
    await this.userCacheService.clearUserSession(userId);
    return { message: 'Sesión cerrada exitosamente.' };
  }

  async getUserSessions(userId: string) {
    return this.sessionService.getUserSessions(userId);
  }

  async revokeSession(userId: string, sessionId: string) {
    return this.sessionService.revokeSession(userId, sessionId);
  }

  private async handleFailedLoginAttempt(user: User) {
    const MAX_FAILED_ATTEMPTS = 5;
    const LOCKOUT_MINUTES = 15;

    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutTime = new Date();
      lockoutTime.setMinutes(lockoutTime.getMinutes() + LOCKOUT_MINUTES);
      user.lockoutUntil = lockoutTime;
    }

    await this.usersService.save(user);
  }

  private async resetLoginAttempts(user: User) {
    if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
      user.failedLoginAttempts = 0;
      user.lockoutUntil = null;
      await this.usersService.save(user);
    }
  }

  async verifyUserFromToken(token: string): Promise<User | null> {
    return this.sessionService.verifyUserFromToken(token);
  }

  async sendPhoneOtp(userId: string, phoneNumber: string) {
    const code = randomInt(100000, 999999).toString();
    const hash = await argon2.hash(code);

    await this.verificationCodeRepository.delete({ userId, type: VerificationType.PHONE_VERIFY });

    const verificationCode = this.verificationCodeRepository.create({
      userId,
      code: hash,
      payload: phoneNumber, // Bind code to specific phone number
      type: VerificationType.PHONE_VERIFY,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await this.verificationCodeRepository.save(verificationCode);

    await this.smsProvider.send(phoneNumber, `Your verification code is: ${code}`);
  }

  async verifyPhoneOtp(userId: string, code: string, phoneNumber: string) {
    const record = await this.verificationCodeRepository.findOne({
      where: { userId, type: VerificationType.PHONE_VERIFY },
    });

    if (!record) {
      throw new BadRequestException('No verification code found or expired.');
    }

    if (new Date() > record.expiresAt) {
      await this.verificationCodeRepository.delete(record.id);
      throw new BadRequestException('Verification code expired.');
    }

    // Security: Check if phone number matches the one the code was sent to
    if (record.payload && record.payload !== phoneNumber) {
        throw new BadRequestException('Invalid phone number for this verification code.');
    }

    const isValid = await argon2.verify(record.code, code);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code.');
    }

    await this.usersService.update(userId, {
      phone: phoneNumber,
      isPhoneVerified: true
    });

    await this.verificationCodeRepository.delete(record.id);

    return { message: 'Phone number verified successfully.' };
  }

  async sendLoginOtp(user: User) {
      const code = randomInt(100000, 999999).toString();
      const hash = await argon2.hash(code);

      await this.verificationCodeRepository.delete({ userId: user.id, type: VerificationType.LOGIN_2FA });

      await this.verificationCodeRepository.save({
          userId: user.id,
          code: hash,
          type: VerificationType.LOGIN_2FA,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      });

      if (user.phone) {
          await this.smsProvider.send(user.phone, `Your Login Code: ${code}`);
      }
  }

  async complete2faLogin(user: User, code: string, ipAddress?: string, userAgent?: string) {
      const isValid2FA = await this.securityAnalysisService.validateTwoFactorCode(user, code);

      if (!isValid2FA) {
         await this.auditService.record(
            user.id,
            'User',
            user.id,
            ActionType.LOGIN_FAILED,
            { email: user.email, reason: 'Invalid 2FA Code' },
            undefined
         );
         throw new UnauthorizedException('Código 2FA inválido');
      }

    // Reset attempts on successful 2FA
    await this.resetLoginAttempts(user);

    await this.auditService.record(
        user.id,
        'User',
        user.id,
        ActionType.LOGIN,
        { email: user.email, ipAddress, userAgent, method: '2FA' },
        undefined,
    );

    return await this.tokenService.generateAuthResponse(user, {}, ipAddress, userAgent);
  }

  private convertToMs(time: string): number {
    return ms(time) as number;
  }
}
