
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ms from 'ms';

import { User } from '../../users/entities/user.entity/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthConfig } from '../auth.config';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>
  ) {}

  async generateAuthResponse(
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

    const refreshExpiration = AuthConfig.JWT_REFRESH_EXPIRATION;
    const expirationDate = new Date(Date.now() + ms(refreshExpiration));

    const refreshTokenRecord = this.refreshTokenRepository.create({
      user: user,
      userId: user.id,
      isRevoked: false,
      expiresAt: expirationDate,
      ipAddress,
      userAgent,
    });

    await this.refreshTokenRepository.save(refreshTokenRecord);

    const accessToken = this.getJwtToken(payload, AuthConfig.JWT_ACCESS_EXPIRATION);

    const refreshTokenPayload = { ...payload, jti: refreshTokenRecord.id };
    const refreshToken = this.getJwtToken(
      refreshTokenPayload,
      refreshExpiration,
      this.configService.get('JWT_REFRESH_SECRET')
    );

    return {
      user: userWithImpersonationStatus,
      accessToken,
      refreshToken,
      refreshTokenId: refreshTokenRecord.id,
    };
  }

  getJwtToken(payload: JwtPayload, expiresIn?: string, secret?: string) {
    return this.jwtService.sign(payload, {
      secret: secret || this.configService.getOrThrow('JWT_SECRET'),
      expiresIn: expiresIn || AuthConfig.JWT_ACCESS_EXPIRATION,
    });
  }

  buildSafeUser(user: User) {
    const permissions = [...new Set(user.roles.flatMap((role) => role.permissions))];
    // Security fields are now in user.security, so they are not directly on user.
    // However, if user.security is loaded (eager: true), we should exclude it or transform it.
    // User entity no longer has passwordHash or twoFactorSecret directly.
    const { security, ...safeUser } = user;
    return {
      ...safeUser,
      permissions,
      organization: user.organization,
      // If we want to expose some security flags (like isTwoFactorEnabled), we should add them back.
      isTwoFactorEnabled: security?.isTwoFactorEnabled || false
    };
  }

  buildPayload(user: User, extra: Partial<JwtPayload> = {}): JwtPayload {
    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roles: user.roles.map((r) => r.name),
      tokenVersion: user.security?.tokenVersion || 0,
      ...extra,
    };
  }
}
