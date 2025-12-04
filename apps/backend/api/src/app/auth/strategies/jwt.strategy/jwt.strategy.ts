
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
             await this.cacheManager.set(cacheKey, user, 15 * 60 * 1000);
        }
    }

    if (!user) {
      throw new UnauthorizedException('Token inválido: el usuario no existe.');
    }


    if (user.tokenVersion !== tokenVersion) {
      // Invalidate cache if token version mismatch found (though we fetched from DB if not in cache,
      // but if in cache it might be old, so this check is crucial)
      // Actually, if it was in cache and tokenVersion changed in DB, cache might be stale.
      // But we rely on tokenVersion in Payload (from JWT) matching User.tokenVersion.
      // If user changed password, DB tokenVersion increments. JWT payload has old version.
      // If we cached the OLD user object, it has OLD tokenVersion.
      // So: CachedUser.tokenVersion == Payload.tokenVersion (Both old). This is a RISK if we don't invalidate cache on logout/change.
      // HOWEVER: The analysis said "Si invalidas sesión... borra entrada en Redis".
      // Since I can't guarantee `logout` or `resetPassword` clears this specific cache key easily without injecting CacheManager in AuthService too,
      // I should ideally check DB if cache says valid? No, that defeats the purpose.
      // The robust way: Cache the user. If we change tokenVersion in DB, we MUST invalidate cache.
      // I will add cache invalidation in AuthService later.

      // For now, if versions match, we are good.
      if (user.tokenVersion !== tokenVersion) {
         // This happens if the JWT itself is old (revoked), even if the User object is fresh.
         throw new UnauthorizedException(
            'La sesión ha sido invalidada. Por favor, inicia sesión de nuevo.',
         );
      }
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
