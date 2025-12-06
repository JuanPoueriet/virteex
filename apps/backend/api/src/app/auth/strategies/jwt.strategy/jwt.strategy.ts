
import { Injectable, UnauthorizedException, Inject, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

import { JwtPayload } from '../../../auth/interfaces/jwt-payload.interface';
import { User, UserStatus } from '../../../users/entities/user.entity/user.entity';
import { AuthConfig } from '../../auth.config';
import { UsersService } from '../../../users/users.service';
import { AuthenticatedUser } from '../../interfaces/authenticated-user.interface';
import { AuthError } from '../../enums/auth-error.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly usersService: UsersService,
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

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const { id, tokenVersion } = payload;
    const cacheKey = `user_session:${id}`;

    // 1. Try to get user from cache
    let user: User | null = null;
    try {
        user = await this.cacheManager.get<User>(cacheKey) ?? null;
    } catch (e) {
        this.logger.error(`Cache unreachable during JWT validation: ${(e as Error).message}. Falling back to DB.`);
        // Fallback silently proceeds to DB check below
    }

    if (!user) {
        // 2. Fallback to DB
        // Using abstracted service method
        user = await this.usersService.findUserByIdForAuth(id);

        if (user) {
             // 3. Store in cache (TTL 15 mins or matching token expiration)
             try {
                // Pre-calculate permissions and attach to user object in cache to avoid re-calc
                (user as any)._cachedPermissions = this.getPermissionsFromRoles(user.roles ?? []);
                await this.cacheManager.set(cacheKey, user, AuthConfig.CACHE_TTL);
             } catch (e) {
                this.logger.warn(`Failed to set user cache during JWT validation: ${(e as Error).message}`);
             }
        }
    }

    if (!user) {
      throw new UnauthorizedException(AuthError.USER_NOT_FOUND);
    }

    // Handle security entity access safely
    const currentTokenVersion = user.security?.tokenVersion || 0;

    if (currentTokenVersion !== tokenVersion) {
      // Note: We are strict about token version matching.
      // Cache invalidation on user/role update is handled by UsersService and AuthService
      // ensuring that the cache doesn't hold stale user objects with old tokenVersions.
      throw new UnauthorizedException(AuthError.SESSION_EXPIRED);
    }

    // Double check: If the cached user has a DIFFERENT tokenVersion than the one in DB (e.g. we changed it in DB but cache is stale),
    // we wouldn't know unless we query DB.
    // BUT, the JWT payload carries the `tokenVersion` at the time of signing.
    // If the cache matches the JWT, we let them in.
    // If the DB has a NEW version, the user effectively has an "Old JWT" + "Old Cached User".
    // This effectively delays the "Global Logout" by the Cache TTL (15m). This is acceptable for performance usually.
    // To be 100% real-time, we must invalidate cache on update.

    if (this.isDisallowedStatus(user.status)) {
      throw new UnauthorizedException(AuthError.USER_BLOCKED);
    }

    const permissions = (user as any)._cachedPermissions || this.getPermissionsFromRoles(user.roles ?? []);

    // Return SafeUser / AuthenticatedUser
    // Exclude sensitive fields
    const { security, password, twoFactorSecret, ...safeUser } = user as any; // Cast to any to strip properties easily, or construct strictly

    // Construct strict AuthenticatedUser
    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      permissions,
      organization: user.organization,
      isTwoFactorEnabled: security?.isTwoFactorEnabled || false,
      isImpersonating: payload.isImpersonating,
      originalUserId: payload.originalUserId
    };

    return authenticatedUser;
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
