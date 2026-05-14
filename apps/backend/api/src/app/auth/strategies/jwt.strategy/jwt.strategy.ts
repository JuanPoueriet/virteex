
import { Injectable, UnauthorizedException, Inject, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import CircuitBreaker = require('opossum');

import { JwtPayload } from '../../../auth/interfaces/jwt-payload.interface';
import { User, UserStatus } from '../../../users/entities/user.entity/user.entity';
import { AuthConfig } from '../../auth.config';
import { UsersService } from '../../../users/users.service';
import { AuthenticatedUser } from '../../interfaces/authenticated-user.interface';
import { AuthError } from '../../enums/auth-error.enum';
import { CachedUser } from '../../interfaces/cached-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  private circuitBreaker: CircuitBreaker;

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request | undefined) => {
            if (req?.cookies?.access_token) {
                return req.cookies.access_token;
            }
            return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });

    // Initialize Opossum Circuit Breaker
    this.circuitBreaker = new CircuitBreaker(
      (key: string) => this.cacheManager.get<CachedUser>(key),
      {
        timeout: 3000, // 3 seconds timeout for Redis
        errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
        resetTimeout: AuthConfig.CACHE_RETRY_DELAY || 30000, // Retry after 30s
      }
    );

    this.circuitBreaker.fallback(() => Promise.resolve(null)); // Fallback returns null (proceed to DB)

    this.circuitBreaker.on('open', () => this.logger.warn('Redis Circuit Breaker OPEN: Using Database Fallback'));
    this.circuitBreaker.on('halfOpen', () => this.logger.log('Redis Circuit Breaker HALF-OPEN: Testing connection'));
    this.circuitBreaker.on('close', () => this.logger.log('Redis Circuit Breaker CLOSED: Cache restored'));
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const { id, tokenVersion, organizationId } = payload;
    const cacheKey = `user_session:${id}`;

    // 1. Try to get user from cache (Circuit Breaker Protected)
    let user: CachedUser | null = null;
    try {
        // Fire the circuit breaker
        user = await this.circuitBreaker.fire(cacheKey) as CachedUser | null;
    } catch (e) {
        this.logger.error(`Circuit Breaker Execution Error: ${(e as Error).message}`);
        user = null;
    }

    // Check if cached user is stale or corrupted
    if (user) {
      const cachedTokenVersion = user.security?.tokenVersion || 0;
      if (cachedTokenVersion !== tokenVersion) {
        this.logger.debug(`Cached user stale (Version ${cachedTokenVersion} vs Token ${tokenVersion}). Invalidating cache locally.`);
        user = null; // Force DB lookup
      } else if (!user.organization) {
         // Critical integrity check: Cache might have serialized incorrectly or lost the relation
         this.logger.warn(`Cached user ${id} is missing Organization relation. Corrupted cache detected. Invalidating.`);
         user = null;
      }
    }

    if (!user) {
        // 2. Fallback to DB
        const dbUser = await this.usersService.findUserByIdForAuth(id);

        if (dbUser) {
             // 3. Store in cache (TTL 15 mins or matching token expiration)
             if (!this.circuitBreaker.opened) {
                 try {
                    // Pre-calculate permissions and attach to user object in cache to avoid re-calc
                    user = {
                      ...dbUser,
                      _cachedPermissions: this.getPermissionsFromRoles(dbUser.roles ?? [])
                    } as CachedUser;

                    await this.cacheManager.set(cacheKey, user, AuthConfig.CACHE_TTL);
                 } catch (e) {
                    this.logger.warn(`Failed to set user cache during JWT validation: ${(e as Error).message}`);
                    user = dbUser as CachedUser;
                 }
             } else {
                 user = dbUser as CachedUser;
             }
        }
    }

    if (!user) {
      this.logger.warn(`User ${id} not found in DB`);
      throw new UnauthorizedException(AuthError.USER_NOT_FOUND);
    }

    // Handle security entity access safely
    const currentTokenVersion = user.security?.tokenVersion || 0;

    if (currentTokenVersion !== tokenVersion) {
      this.logger.warn(`Session expired for user ${id}: DB Version ${currentTokenVersion} !== Token Version ${tokenVersion}`);
      throw new UnauthorizedException(AuthError.SESSION_EXPIRED);
    }

    if (this.isDisallowedStatus(user.status)) {
      throw new UnauthorizedException(AuthError.USER_BLOCKED);
    }

    const permissions = user._cachedPermissions || this.getPermissionsFromRoles(user.roles ?? []);

    // 10/10 SECURITY: Organization Context Validation
    if (!user.organization) {
         this.logger.error(`User ${user.id} authenticated but has no linked Organization. Access Denied.`);
         throw new UnauthorizedException(AuthError.USER_NOT_FOUND);
    }

    // Strict validation: The token's organization context must match one of the user's organizations
    if (organizationId) {
        const isCurrentOrg = user.organization?.id === organizationId;
        const hasAccess = isCurrentOrg || (user.organizations && user.organizations.some(o => o.id === organizationId));

        if (!hasAccess) {
            this.logger.warn(`User ${user.id} attempted to access with token for Organization ${organizationId} but has no access to it.`);
            throw new UnauthorizedException(AuthError.INVALID_CREDENTIALS);
        }

        if (!isCurrentOrg && hasAccess) {
             const switchedOrg = user.organizations.find(o => o.id === organizationId);
             if (switchedOrg) {
                 user.organization = switchedOrg;
             }
        }
    }

    // Return SafeUser / AuthenticatedUser
    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organization.id,
      roles: user.roles,
      permissions,
      organization: user.organization,
      isTwoFactorEnabled: user.security?.isTwoFactorEnabled || false,
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
