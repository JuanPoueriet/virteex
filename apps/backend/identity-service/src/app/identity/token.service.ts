import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import ms from 'ms';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

import { User, UserStatus } from './user.entity';
import { RefreshToken } from './refresh-token.entity';
import { JwtPayload } from './jwt-payload.interface';
import { AuthConfig } from './auth.config';
import { AuthenticatedUser } from './authenticated-user.interface';
import { AuthError } from './auth-error.enum';
import { ITokenService, IUserCacheService, IGeoService } from './identity.interfaces';
import { USER_CACHE_SERVICE_TOKEN, GEO_SERVICE_TOKEN } from './identity.constants';

@Injectable()
export class TokenService implements ITokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(USER_CACHE_SERVICE_TOKEN)
    private readonly userCacheService: IUserCacheService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(GEO_SERVICE_TOKEN)
    private readonly geoService: IGeoService
  ) {}

  async validateTokenAndGetUser(payload: JwtPayload): Promise<AuthenticatedUser> {
    let user = await this.userCacheService.getUser(payload.id);

    if (!user) {
      user = await this.userRepository.createQueryBuilder('user')
        .where('user.id = :id', { id: payload.id })
        .leftJoinAndSelect('user.roles', 'roles')
        .leftJoinAndSelect('user.organization', 'organization')
        .leftJoinAndSelect('user.security', 'security')
        .leftJoin('user.organizations', 'orgs')
        .addSelect(['orgs.id', 'orgs.legalName'])
        .getOne();

      if (user) {
        await this.userCacheService.setUser(payload.id, user, AuthConfig.CACHE_TTL);
      }
    }

    if (!user || user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException(AuthError.USER_BLOCKED);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(AuthError.USER_INACTIVE);
    }

    const tokenVersion = user.security?.tokenVersion || 0;
    if (tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException(AuthError.SESSION_EXPIRED);
    }

    const safeUser = this.buildSafeUser(user);
    return {
      ...safeUser,
      isImpersonating: payload.isImpersonating,
      originalUserId: payload.originalUserId,
    };
  }

  async getFreshUserStatus(userFromJwt: AuthenticatedUser) {
    let freshUser = await this.userCacheService.getUser(userFromJwt.id);

    if (!freshUser) {
        freshUser = await this.userRepository.findOne({
            where: { id: userFromJwt.id },
            relations: ['roles', 'organization', 'security']
        });

        if (freshUser) {
            await this.userCacheService.setUser(userFromJwt.id, freshUser, AuthConfig.CACHE_TTL);
        }
    }

    if (!freshUser) {
      throw new UnauthorizedException(AuthError.USER_NOT_FOUND);
    }

    const safeUser = this.buildSafeUser(freshUser);
    return { user: { ...safeUser, isImpersonating: userFromJwt.isImpersonating || false } };
  }

  async generateAuthResponse(
    user: User,
    extraPayload: Partial<JwtPayload> = {},
    ipAddress?: string,
    userAgent?: string,
    rememberMe: boolean = false
  ) {
    const payload = this.buildPayload(user, extraPayload);
    const safeUser = this.buildSafeUser(user);

    const refreshExpiration = rememberMe
        ? AuthConfig.JWT_REFRESH_REMEMBER_ME_EXPIRATION
        : AuthConfig.JWT_REFRESH_EXPIRATION;

    const expirationDate = new Date(Date.now() + ms(refreshExpiration));

    const refreshTokenRecord = this.refreshTokenRepository.create({
      userId: user.id,
      isRevoked: false,
      expiresAt: expirationDate,
      ipAddress,
      userAgent,
    });

    if (ipAddress) {
       const location = this.geoService.getLocation(ipAddress);
       if (location) {
          refreshTokenRecord.country = location.country;
          refreshTokenRecord.city = location.city;
          refreshTokenRecord.region = location.region;
          refreshTokenRecord.latitude = location.ll ? location.ll[0] : null;
          refreshTokenRecord.longitude = location.ll ? location.ll[1] : null;
       }
    }

    await this.refreshTokenRepository.save(refreshTokenRecord);

    const accessToken = this.getJwtToken(payload, AuthConfig.JWT_ACCESS_EXPIRATION);
    const refreshTokenPayload = { ...payload, jti: refreshTokenRecord.id };
    const refreshToken = this.getJwtToken(
      refreshTokenPayload,
      refreshExpiration,
      this.configService.get('JWT_REFRESH_SECRET')
    );

    return {
      user: { ...safeUser, isImpersonating: payload.isImpersonating || false },
      accessToken,
      refreshToken,
      refreshTokenId: refreshTokenRecord.id,
    };
  }

  private getJwtToken(payload: JwtPayload, expiresIn?: string, secret?: string) {
    return this.jwtService.sign(payload, {
      secret: secret || this.configService.getOrThrow('JWT_SECRET'),
      expiresIn: expiresIn || AuthConfig.JWT_ACCESS_EXPIRATION,
    });
  }

  private buildSafeUser(user: User) {
    const permissions = [...new Set(user.roles?.flatMap((role) => role.permissions) || [])];
    const { security, ...safeUser } = user;
    return {
      ...safeUser,
      permissions,
      isTwoFactorEnabled: security?.isTwoFactorEnabled || false
    };
  }

  private buildPayload(user: User, extra: Partial<JwtPayload> = {}): JwtPayload {
    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roles: user.roles?.map((r) => r.name) || [],
      tokenVersion: user.security?.tokenVersion || 0,
      ...extra,
    };
  }
}
