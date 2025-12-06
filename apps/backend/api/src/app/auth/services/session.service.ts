import {
  Injectable,
  UnauthorizedException,
  Logger,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as ms from 'ms';

import { RefreshToken } from '../entities/refresh-token.entity';
import { User, UserStatus } from '../../users/entities/user.entity/user.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthConfig } from '../auth.config';
// AuditTrailService removed from here, used via event
import { ActionType } from '../../audit/entities/audit-log.entity';
import { UserCacheService } from '../modules/user-cache.service';
import { UsersService } from '../../users/users.service';
import { SecurityAnalysisService } from './security-analysis.service';
import { TokenService } from './token.service';
import { UserSecurity } from '../../users/entities/user-security.entity';
import { AuthEvents, AuthAuditActionEvent } from '../events/auth.events';
import { AuthError } from '../enums/auth-error.enum';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(UserSecurity)
    private readonly userSecurityRepository: Repository<UserSecurity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userCacheService: UserCacheService,
    private readonly securityAnalysisService: SecurityAnalysisService,
    private readonly tokenService: TokenService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async refreshAccessToken(token: string, ipAddress?: string, userAgent?: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload & { jti?: string }>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findUserByIdForAuth(payload.id);

      if (!user) {
        throw new UnauthorizedException(AuthError.USER_NOT_FOUND);
      }
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException(AuthError.USER_INACTIVE);
      }

      if (payload.jti) {
        const refreshTokenEntity = await this.refreshTokenRepository.findOneBy({ id: payload.jti });

        if (!refreshTokenEntity || refreshTokenEntity.isRevoked) {
          const GRACE_PERIOD = AuthConfig.REFRESH_GRACE_PERIOD;
          if (
            refreshTokenEntity?.revokedAt &&
            Date.now() - refreshTokenEntity.revokedAt.getTime() < GRACE_PERIOD
          ) {
            this.logger.warn(
              `[SECURITY] Refresh token reused within grace period. Issuing new token.`
            );

            if (refreshTokenEntity.replacedByToken) {
              await this.refreshTokenRepository.update(refreshTokenEntity.replacedByToken, {
                isRevoked: true,
                revokedAt: new Date(),
              });
            }
          } else {
            this.logger.warn(
              `[SECURITY] Reuse detection: Refresh token ${payload.jti} was used but is revoked/missing. Invalidating user ${user.id}.`
            );

            // 10/10 SECURITY: NUCLEAR FAMILY INVALIDATION
            // When a revoked token is reused (outside grace period), we assume the token family is compromised.
            // Incrementing tokenVersion invalidates ALL existing Access and Refresh tokens for this user globally.
            if (user.security) {
                user.security.tokenVersion = (user.security.tokenVersion || 0) + 1;
                await this.userSecurityRepository.save(user.security);
            }

            await this.userCacheService.clearUserSession(user.id);
            // Also explicitly revoke all refresh tokens in DB for audit purposes
            await this.refreshTokenRepository.update(
                { userId: user.id, isRevoked: false },
                { isRevoked: true, revokedAt: new Date() }
            );

            throw new UnauthorizedException(AuthError.REFRESH_TOKEN_REVOKED);
          }
        } else {
          // User Agent Analysis (using new SecurityAnalysisService)
          if (
            refreshTokenEntity.userAgent &&
            userAgent &&
            refreshTokenEntity.userAgent !== userAgent
          ) {
            const storedUA = this.securityAnalysisService.parseUserAgent(
              refreshTokenEntity.userAgent
            );
            const currentUA = this.securityAnalysisService.parseUserAgent(userAgent);

            const isBrowserMatch = storedUA.browser === currentUA.browser;
            const isOSMatch = storedUA.os === currentUA.os;

            if (!isBrowserMatch || !isOSMatch) {
              this.logger.warn(
                `[SECURITY] User Agent mismatch detected (OS/Browser changed). Stored: '${refreshTokenEntity.userAgent}', Current: '${userAgent}'. Potential session hijacking.`
              );
              throw new UnauthorizedException(
                AuthError.DEVICE_MISMATCH
              );
            } else {
              this.logger.warn(
                `[SECURITY] Minor User Agent change detected (likely update). Stored: '${refreshTokenEntity.userAgent}', Current: '${userAgent}'. Allowing.`
              );
            }
          }

          if (
            refreshTokenEntity.ipAddress &&
            ipAddress &&
            refreshTokenEntity.ipAddress !== ipAddress
          ) {
            // Mask IP in logs
            const maskedIp = this.maskIp(refreshTokenEntity.ipAddress);
            const maskedNewIp = this.maskIp(ipAddress);
            this.logger.log(
              `[SECURITY] IP Change for Refresh: ${maskedIp} -> ${maskedNewIp}`
            );
          }

          refreshTokenEntity.isRevoked = true;
          refreshTokenEntity.revokedAt = new Date();
          await this.refreshTokenRepository.save(refreshTokenEntity);
        }
      }

      const authResponse = await this.tokenService.generateAuthResponse(user, {}, ipAddress, userAgent);

      if (payload.jti) {
        await this.refreshTokenRepository.update(payload.jti, {
          replacedByToken: authResponse.refreshTokenId,
        });
      }

      this.eventEmitter.emit(
          AuthEvents.AUDIT_ACTION,
          new AuthAuditActionEvent(
              user.id,
              'User',
              user.id,
              ActionType.REFRESH,
              { email: user.email, ipAddress, userAgent }
          )
      );

      return {
        user: authResponse.user,
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
      };
    } catch (error) {
      this.logger.error('Error al verificar el refresh token:', (error as Error).message);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(AuthError.REFRESH_TOKEN_INVALID);
    }
  }

  async getUserSessions(userId: string) {
    const sessions = await this.refreshTokenRepository.find({
      where: {
        userId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    return sessions.map((session) => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: false,
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

  async terminateAllSessions(userId: string) {
      await this.userCacheService.clearUserSession(userId);
      // Optional: Revoke all refresh tokens in DB if stricter security is needed
      // await this.refreshTokenRepository.update({ userId, isRevoked: false }, { isRevoked: true, revokedAt: new Date() });
  }

  async verifyUserFromToken(token: string): Promise<User | null> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
      });

      const user = await this.usersService.findUserByIdForAuth(payload.id);

      if (
        !user ||
        user.status !== UserStatus.ACTIVE ||
        (user.security?.tokenVersion || 0) !== payload.tokenVersion
      ) {
        return null;
      }

      return user;
    } catch (e) {
      return null;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTokenCleanup() {
    this.logger.log('Starting expired refresh token cleanup...');
    const retentionPeriod = 30; // days
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - retentionPeriod);

    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(expirationDate),
    });

    const resultRevoked = await this.refreshTokenRepository.delete({
      isRevoked: true,
      revokedAt: LessThan(expirationDate),
    });

    this.logger.log(
      `Cleanup complete. Deleted ${result.affected} expired tokens and ${resultRevoked.affected} revoked tokens.`
    );
  }

  private maskIp(ip: string): string {
      // Basic masking, keep first 2 octets for IPv4
      if (ip.includes('.')) {
          const parts = ip.split('.');
          if (parts.length === 4) {
              return `${parts[0]}.${parts[1]}.*.*`;
          }
      }
      // For IPv6, keep first segment
      if (ip.includes(':')) {
          const parts = ip.split(':');
          return `${parts[0]}:*:...`;
      }
      return '***';
  }
}
