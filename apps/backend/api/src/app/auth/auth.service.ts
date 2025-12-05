
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as ms from 'ms';
import { authenticator } from 'otplib';
import { Cron, CronExpression } from '@nestjs/schedule';

import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { SetPasswordFromInvitationDto } from './dto/set-password-from-invitation.dto';
import { User, UserStatus } from '../users/entities/user.entity/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthConfig } from './auth.config';
import { AuditTrailService } from '../audit/audit.service';
import { ActionType } from '../audit/entities/audit-log.entity';
import { UserCacheService } from './services/user-cache.service';
import { GeoService } from '../geo/geo.service';
import { CryptoUtil } from '../shared/utils/crypto.util';
import { SocialUser } from './interfaces/social-user.interface';
import { RegistrationService } from './services/registration.service';
import { PasswordRecoveryService } from './services/password-recovery.service';
import { ImpersonationService } from './services/impersonation.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditTrailService,
    private readonly userCacheService: UserCacheService,
    private readonly cryptoUtil: CryptoUtil,
    private readonly registrationService: RegistrationService,
    private readonly passwordRecoveryService: PasswordRecoveryService,
    private readonly impersonationService: ImpersonationService,
    private readonly geoService: GeoService
  ) {}

  async validateOAuthLogin(socialUser: SocialUser, ipAddress?: string, userAgent?: string): Promise<{ user: User | null; tokens?: any }> {
    const user = await this.userRepository.findOne({
      where: { email: socialUser.email },
      relations: ['roles', 'organization'],
    });

    if (user) {
      // User exists, update provider info if not set or different (link account)
      if (user.authProvider !== socialUser.provider || user.authProviderId !== socialUser.providerId) {
        // Asynchronous update (Fire and forget) - Fixed to await for data consistency
        await this.userRepository.update(user.id, {
          authProvider: socialUser.provider,
          authProviderId: socialUser.providerId,
          // Optional: Update avatar if missing
          avatarUrl: user.avatarUrl || socialUser.picture
        });

        // Update in memory for response
        user.authProvider = socialUser.provider;
        user.authProviderId = socialUser.providerId;
      }

       if (user.status !== UserStatus.ACTIVE) {
         throw new UnauthorizedException('Usuario inactivo o bloqueado.');
       }

      // Log Login (Non-blocking) - Fixed to await for data consistency
      await this.auditService.record(
        user.id,
        'User',
        user.id,
        ActionType.LOGIN,
        { email: user.email, provider: socialUser.provider, ipAddress, userAgent },
        undefined,
      );

       const authResponse = await this.generateAuthResponse(user, {}, ipAddress, userAgent);
       return { user, tokens: authResponse };
    }

    // User does not exist
    return { user: null };
  }

  async register(registerUserDto: RegisterUserDto, ipAddress?: string, userAgent?: string) {
    const user = await this.registrationService.register(registerUserDto);
    const authResponse = await this.generateAuthResponse(user, {}, ipAddress, userAgent);

    return {
      user: authResponse.user,
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
    };
  }


  async login(loginUserDto: LoginUserDto & { twoFactorCode?: string }, ipAddress?: string, userAgent?: string) {
    const { email, password, twoFactorCode } = loginUserDto;

    const user = await this.findUserForLogin(email);

    if (user && user.lockoutUntil && new Date() < user.lockoutUntil) {
      const remainingTime = Math.ceil(
        (user.lockoutUntil.getTime() - Date.now()) / (1000 * 60),
      );
      throw new UnauthorizedException(
        `Cuenta bloqueada temporalmente. Intente nuevamente en ${remainingTime} minutos.`,
      );
    }

    // Timing attack mitigation: verify password even if user not found (with dummy hash)
    // or if user found but wrong password.
    // If user is null, we simulate argon2 time.
    let isPasswordValid = false;
    if (user && user.passwordHash) {
        isPasswordValid = await argon2.verify(user.passwordHash, password);
    } else {
        // Dummy comparison to simulate time (using a fixed dummy hash)
        // This prevents timing leaks revealing if email exists
        try {
            await argon2.verify(AuthConfig.DUMMY_PASSWORD_HASH, password);
        } catch (e) {
            // Ignore error
        }
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
      await this.simulateDelay(); // Additional Safe delay
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

    // Geo-Fencing: Log detected country
    if (ipAddress) {
        const location = this.geoService.getLocation(ipAddress);
        if (location && location.country) {
            this.logger.log(`User login from Country: ${location.country} (IP: ${ipAddress})`);
            // Future: Implement country whitelist/blacklist checks here
            // if (user.allowedCountries && !user.allowedCountries.includes(location.country)) { ... }
        }
    }

    // 2FA Check
    if (user.isTwoFactorEnabled) {
      if (!twoFactorCode) {
        throw new ForbiddenException('Se requiere código de autenticación de dos factores (2FA).');
      }

      // Decrypt Secret before verify
      const decryptedSecret = this.cryptoUtil.decrypt(user.twoFactorSecret);
      const isValid2FA = authenticator.verify({
        token: twoFactorCode,
        secret: decryptedSecret
      });

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

    return await this.generateAuthResponse(user, {}, ipAddress, userAgent);
  }


  async validate(payload: JwtPayload): Promise<any> {
    // Optimization: Check cache first
    let user = await this.userCacheService.getUser(payload.id);

    if (!user) {
      user = await this.userRepository.findOne({
        where: { id: payload.id },
        relations: ['roles', 'organization'],
      });

      if (user) {
        // Cache for 15 minutes (or AuthConfig.CACHE_TTL)
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

    const safeUser = this.buildSafeUser(user);

    return {
      ...safeUser,
      isImpersonating: payload.isImpersonating,
      originalUserId: payload.originalUserId,
    };
  }

  private async simulateDelay() {
    // Retardo fijo de 500ms (configurable) para mitigar timing attacks de forma segura y predecible
    return new Promise((resolve) => setTimeout(resolve, AuthConfig.SIMULATED_DELAY_MS));
  }

  private async findUserForLogin(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('user.organization', 'organization')
      .addSelect('user.twoFactorSecret')
      .addSelect('user.isTwoFactorEnabled')
      .where('user.email = :email', { email })
      .select([
        'user.id',
        'user.email',
        'user.passwordHash',
        'user.status',
        'user.organizationId',
        'user.firstName',
        'user.lastName',
        'user.preferredLanguage',
        'user.failedLoginAttempts',
        'user.lockoutUntil',
        'user.tokenVersion',
        'user.twoFactorSecret',
        'user.isTwoFactorEnabled',
        'role.id',
        'role.name',
        'role.permissions',
        'organization.id',
        'organization.legalName',
        'organization.taxId',
        // 'organization.logoUrl', // Optimized: Logo not needed for auth payload
      ])
      .getOne();
  }

  async setPasswordFromInvitation(
    setPasswordDto: SetPasswordFromInvitationDto,
  ) {
    // Delegate to PasswordRecoveryService for business logic
    const user = await this.passwordRecoveryService.setPasswordFromInvitation(setPasswordDto);

    // Perform login (generate tokens)
    return await this.generateAuthResponse(user);
  }

  async refreshAccessToken(token: string, ipAddress?: string, userAgent?: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload & { jti?: string }>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // 1. Check if user exists and is valid
      const user = await this.userRepository.findOne({
        where: { id: payload.id },
        relations: ['roles', 'organization'],
      });

      if (!user) {
        throw new UnauthorizedException('El usuario del token ya no existe.');
      }
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('El usuario del token está inactivo.');
      }

      // 2. Refresh Token Rotation Logic
      if (payload.jti) {
         const refreshTokenEntity = await this.refreshTokenRepository.findOneBy({ id: payload.jti });

         // Reuse Detection
         if (!refreshTokenEntity || refreshTokenEntity.isRevoked) {
             // Grace Period Check (e.g. 10 seconds)
             // If the token was revoked very recently, it might be a race condition (frontend retry).
             // In this case, we issue a new token instead of invalidating the user.
             // But we need to ensure we don't break the chain.
             const GRACE_PERIOD = AuthConfig.REFRESH_GRACE_PERIOD;
             if (refreshTokenEntity?.revokedAt && (Date.now() - refreshTokenEntity.revokedAt.getTime() < GRACE_PERIOD)) {
                 this.logger.warn(`[SECURITY] Refresh token reused within grace period. Issuing new token.`);

                 // If we have a replacedByToken, we should revoke IT to maintain a single valid tip.
                 // This effectively "prunes" the previous branch that caused the race.
                 if (refreshTokenEntity.replacedByToken) {
                     await this.refreshTokenRepository.update(refreshTokenEntity.replacedByToken, {
                         isRevoked: true,
                         revokedAt: new Date(),
                     });
                 }

                 // Fall through to generate new response (we treat this as valid for rotation purpose)
             } else {
                 this.logger.warn(`[SECURITY] Reuse detection: Refresh token ${payload.jti} was used but is revoked/missing. Invalidating user ${user.id}.`);
                 user.tokenVersion = (user.tokenVersion || 0) + 1;
                 await this.userRepository.save(user);
                 await this.userCacheService.clearUserSession(user.id);
                 throw new UnauthorizedException('Refresh token reutilizado. Sesión invalidada.');
             }
         } else {
            // Normal Rotation: Revoke the current token
            // If it was already revoked (grace period case above), we skip this block

            // Fingerprint Validation (only for active tokens)
            if (refreshTokenEntity.userAgent && userAgent && refreshTokenEntity.userAgent !== userAgent) {
                this.logger.warn(`[SECURITY] User Agent mismatch. Token created with ${refreshTokenEntity.userAgent}, used with ${userAgent}. Revoking.`);
                refreshTokenEntity.isRevoked = true;
                refreshTokenEntity.revokedAt = new Date();
                await this.refreshTokenRepository.save(refreshTokenEntity);
                throw new UnauthorizedException('Cambio de dispositivo detectado. Por favor inicie sesión nuevamente.');
            }

            // IP Validation
            if (refreshTokenEntity.ipAddress && ipAddress && refreshTokenEntity.ipAddress !== ipAddress) {
                this.logger.log(`[SECURITY] IP Change for Refresh: ${refreshTokenEntity.ipAddress} -> ${ipAddress}`);
            }

            // Revoke current token
            refreshTokenEntity.isRevoked = true;
            refreshTokenEntity.revokedAt = new Date();
            // Note: replacedByToken will be updated after new token creation if we had the ID,
            // but here we just mark it revoked. To link properly, we need the new ID.
            // We'll update it after generating the new token.
            await this.refreshTokenRepository.save(refreshTokenEntity);
         }
      }

      // 3. Issue new pair
      const authResponse = await this.generateAuthResponse(user, {}, ipAddress, userAgent);

      // 4. Update replacedByToken for the old token to link the chain
      if (payload.jti) {
          // We can just update it blindly even if it was already updated (in race condition, last one wins)
          await this.refreshTokenRepository.update(payload.jti, {
              replacedByToken: authResponse.refreshTokenId // We need to expose this from generateAuthResponse
          });
      }

      await this.auditService.record(
        user.id,
        'User',
        user.id,
        ActionType.REFRESH,
        { email: user.email, ipAddress, userAgent },
      );

      return {
        user: authResponse.user,
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
      };
    } catch (error) {
      this.logger.error(
        'Error al verificar el refresh token:',
        (error as Error).message,
      );
      if (error instanceof UnauthorizedException) {
          throw error;
      }
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTokenCleanup() {
    this.logger.log('Starting expired refresh token cleanup...');
    const retentionPeriod = 30; // days
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - retentionPeriod);

    const result = await this.refreshTokenRepository.delete({
       expiresAt: LessThan(expirationDate)
    });

    // Also delete revoked tokens older than 30 days
    const resultRevoked = await this.refreshTokenRepository.delete({
        isRevoked: true,
        revokedAt: LessThan(expirationDate)
    });

    this.logger.log(`Cleanup complete. Deleted ${result.affected} expired tokens and ${resultRevoked.affected} revoked tokens.`);
  }


  async status(userFromJwt: any) {
    // Optimization: Check cache first
    let freshUser = await this.userCacheService.getUser(userFromJwt.id);

    if (!freshUser) {
        freshUser = await this.userRepository.findOne({
            where: { id: userFromJwt.id },
            relations: ['roles', 'organization'],
        });

        if (freshUser) {
            await this.userCacheService.setUser(userFromJwt.id, freshUser, AuthConfig.CACHE_TTL);
        }
    }

    if (!freshUser) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const safeUser = this.buildSafeUser(freshUser);

    const userWithImpersonationStatus = {
      ...safeUser,
      isImpersonating: userFromJwt.isImpersonating || false,
      originalUserId: userFromJwt.originalUserId || undefined,
    };

    return { user: userWithImpersonationStatus };
  }


  async impersonate(adminUser: User, targetUserId: string) {
    const targetUser = await this.impersonationService.validateImpersonationRequest(adminUser, targetUserId);

    return await this.generateAuthResponse(targetUser, {
      isImpersonating: true,
      originalUserId: adminUser.id,
    });
  }

  async stopImpersonation(impersonatingUser: User) {
    const adminUser = await this.impersonationService.validateStopImpersonation(impersonatingUser);

    return await this.generateAuthResponse(adminUser);
  }

  async logout(userId: string) {
    // Just invalidate the cache to ensure next request hits DB (and any token version check therein)
    // Real logout with JWT is client-side, but if we want to ensure immediate rejection:
    await this.userCacheService.clearUserSession(userId);
    return { message: 'Sesión cerrada exitosamente.' };
  }

  async getUserSessions(userId: string) {
    const sessions = await this.refreshTokenRepository.find({
      where: {
        userId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()), // Use TypeORM 'MoreThan' which needs import, or builder
      },
      order: { createdAt: 'DESC' },
    });

    return sessions.map((session) => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: false, // Controller can enrich this if needed, or we rely on ID match
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.refreshTokenRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada o no pertenece al usuario.');
    }

    session.isRevoked = true;
    session.revokedAt = new Date();
    await this.refreshTokenRepository.save(session);

    return { message: 'Sesión revocada exitosamente.' };
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

    await this.userRepository.save(user);
  }

  private async resetLoginAttempts(user: User) {
    if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
      user.failedLoginAttempts = 0;
      user.lockoutUntil = null;
      await this.userRepository.save(user);
    }
  }

  private buildSafeUser(user: User) {
    const permissions = [
      ...new Set(user.roles.flatMap((role) => role.permissions)),
    ];
    const { passwordHash, twoFactorSecret, ...safeUser } = user;
    return {
      ...safeUser,
      permissions,
      organization: user.organization,
    };
  }

  private buildPayload(
    user: User,
    extra: Partial<JwtPayload> = {},
  ): JwtPayload {
    // Optimized: Permissions removed from JWT payload to reduce size.
    // Frontend should use permissions from the User object in the response or API calls,
    // not by decoding the token.
    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roles: user.roles.map((r) => r.name),
      tokenVersion: user.tokenVersion,
      ...extra,
    };
  }

  private async generateAuthResponse(
    user: User,
    extraPayload: Partial<JwtPayload> = {},
    ipAddress?: string,
    userAgent?: string
  ) {
    const payload = this.buildPayload(user, extraPayload);
    const safeUser = this.buildSafeUser(user);

    const userWithImpersonationStatus = {
      ...safeUser,
      isImpersonating: payload.isImpersonating || false,
      originalUserId: payload.originalUserId || undefined,
    };

    // Create Refresh Token Record
    const refreshExpiration = AuthConfig.JWT_REFRESH_EXPIRATION;
    const expirationDate = new Date(Date.now() + this.convertToMs(refreshExpiration));

    const refreshTokenRecord = this.refreshTokenRepository.create({
        user: user,
        userId: user.id,
        isRevoked: false,
        expiresAt: expirationDate,
        ipAddress,
        userAgent
    });

    await this.refreshTokenRepository.save(refreshTokenRecord);

    // Sign Access Token
    const accessToken = this.getJwtToken(payload, AuthConfig.JWT_ACCESS_EXPIRATION);

    // Sign Refresh Token including the JTI (JWT ID) referring to the DB record
    const refreshTokenPayload = { ...payload, jti: refreshTokenRecord.id };
    const refreshToken = this.getJwtToken(
        refreshTokenPayload,
        refreshExpiration,
        this.configService.get('JWT_REFRESH_SECRET'),
    );

    return {
      user: userWithImpersonationStatus,
      accessToken,
      refreshToken,
      refreshTokenId: refreshTokenRecord.id // Exposed for internal use
    };
  }

  private getJwtToken(
    payload: JwtPayload,
    expiresIn?: string,
    secret?: string,
  ) {
    return this.jwtService.sign(payload, {
      secret: secret || this.configService.getOrThrow('JWT_SECRET'),
      expiresIn: expiresIn || AuthConfig.JWT_ACCESS_EXPIRATION,
    });
  }

  async verifyUserFromToken(token: string): Promise<User | null> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.id },
        relations: ['roles', 'organization'],
      });

      if (!user || user.status !== UserStatus.ACTIVE || user.tokenVersion !== payload.tokenVersion) {
        return null;
      }

      return user;
    } catch (e) {
      return null;
    }
  }

  private convertToMs(time: string): number {
    return ms(time) as number;
  }
}
