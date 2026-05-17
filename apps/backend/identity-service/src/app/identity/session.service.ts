import { Injectable, UnauthorizedException, Inject, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { RefreshToken } from './refresh-token.entity';
import { User, UserStatus } from './user.entity';
import { JwtPayload } from './jwt-payload.interface';
import { AuthConfig } from './auth.config';
import { AuthError } from './auth-error.enum';
import { ISessionService, IUsersService, ISecurityAnalysisService, ITokenService, IUserCacheService, IGeoService } from './identity.interfaces';
import { USERS_SERVICE_TOKEN, SECURITY_ANALYSIS_SERVICE_TOKEN, TOKEN_SERVICE_TOKEN, USER_CACHE_SERVICE_TOKEN, GEO_SERVICE_TOKEN } from './identity.constants';

@Injectable()
export class SessionService implements ISessionService, OnModuleInit {
  private encryptionKey: Buffer;

  constructor(
    @Inject(USERS_SERVICE_TOKEN)
    private readonly usersService: IUsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(USER_CACHE_SERVICE_TOKEN)
    private readonly userCacheService: IUserCacheService,
    @Inject(SECURITY_ANALYSIS_SERVICE_TOKEN)
    private readonly securityAnalysisService: ISecurityAnalysisService,
    @Inject(TOKEN_SERVICE_TOKEN)
    private readonly tokenService: ITokenService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(GEO_SERVICE_TOKEN)
    private readonly geoService: IGeoService
  ) {}

  onModuleInit() {
      const secret = this.configService.get<string>('ENCRYPTION_SECRET') || 'secret';
      const salt = this.configService.get<string>('AUTH_SALT') || 'salt';
      this.encryptionKey = crypto.scryptSync(secret, salt, 32);
  }

  async refreshAccessToken(token: string, ipAddress?: string, userAgent?: string) {
    const payload = this.jwtService.verify<JwtPayload & { jti?: string }>(token, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });

    const user = await this.usersService.findOne(payload.id);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(AuthError.USER_INACTIVE);
    }

    if (payload.jti) {
      await this.refreshTokenRepository.update(payload.jti, { isRevoked: true, revokedAt: new Date() });
    }

    return this.tokenService.generateAuthResponse(user, {}, ipAddress, userAgent);
  }

  async getUserSessions(userId: string, currentRefreshTokenId?: string) {
    const sessions = await this.refreshTokenRepository.find({
      where: { userId, isRevoked: false, expiresAt: MoreThan(new Date()) },
    });
    return sessions as any[];
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.refreshTokenRepository.update({ id: sessionId, userId }, { isRevoked: true, revokedAt: new Date() });
    return { message: 'Session revoked' };
  }

  async terminateAllSessions(userId: string) {
      await this.userCacheService.clearUserSession(userId);
      await this.refreshTokenRepository.update({ userId, isRevoked: false }, { isRevoked: true, revokedAt: new Date() });
  }
}
