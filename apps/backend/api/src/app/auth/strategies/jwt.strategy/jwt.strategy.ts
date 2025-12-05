
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

import { JwtPayload } from '../../../auth/interfaces/jwt-payload.interface';
import { User, UserStatus } from '../../../users/entities/user.entity/user.entity';
import { AuthConfig } from '../../auth.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {
    super({

      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request | undefined) => req?.cookies?.access_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<Partial<User>> {
    const { id, tokenVersion } = payload;
    const cacheKey = `user_session:${id}`;

    // 1. Try to get user from cache
    let user = await this.cacheManager.get<User>(cacheKey);

    if (!user) {
        // 2. Fallback to DB
        user = await this.userRepository.findOne({
          where: { id },
          relations: ['roles'],
          select: [
            'id',
            'email',
            'firstName',
            'lastName',
            'status',
            'tokenVersion',
            'organizationId',
          ],
        });

        if (user) {
             // 3. Store in cache (TTL 15 mins or matching token expiration)
             await this.cacheManager.set(cacheKey, user, AuthConfig.CACHE_TTL);
        }
    }

    if (!user) {
      throw new UnauthorizedException('Token inválido: el usuario no existe.');
    }


    if (user.tokenVersion !== tokenVersion) {
      // Note: We are strict about token version matching.
      // Cache invalidation on user/role update is handled by UsersService and AuthService
      // ensuring that the cache doesn't hold stale user objects with old tokenVersions.
      throw new UnauthorizedException(
        'La sesión ha sido invalidada. Por favor, inicia sesión de nuevo.',
      );
    }

    // Double check: If the cached user has a DIFFERENT tokenVersion than the one in DB (e.g. we changed it in DB but cache is stale),
    // we wouldn't know unless we query DB.
    // BUT, the JWT payload carries the `tokenVersion` at the time of signing.
    // If the cache matches the JWT, we let them in.
    // If the DB has a NEW version, the user effectively has an "Old JWT" + "Old Cached User".
    // This effectively delays the "Global Logout" by the Cache TTL (15m). This is acceptable for performance usually.
    // To be 100% real-time, we must invalidate cache on update.

    if (this.isDisallowedStatus(user.status)) {
      throw new UnauthorizedException(
        `El usuario se encuentra ${user.status.toLowerCase()}.`,
      );
    }


    const permissions = this.getPermissionsFromRoles(user.roles ?? []);


    return { ...user, permissions };
  }

  private isDisallowedStatus(status: UserStatus | undefined): boolean {
    return (
      status === UserStatus.BLOCKED ||
      status === UserStatus.INACTIVE ||
      status === UserStatus.ARCHIVED
    );
  }

  private getPermissionsFromRoles(roles: Array<{ permissions?: string[] }>): string[] {
    const perms = roles.flatMap((r) => r.permissions ?? []);
    return [...new Set(perms)];
  }
}
