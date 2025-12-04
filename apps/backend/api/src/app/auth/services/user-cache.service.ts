
import { Injectable } from '@nestjs/common';
import { User } from '../../users/entities/user.entity/user.entity';

@Injectable()
export class UserCacheService {
  private cache = new Map<string, { user: Partial<User>; expiry: number }>();
  private readonly TTL = 60 * 1000; // 1 minute in-memory cache for fast JWT validation

  /**
   * Retrieves a user from the cache if it exists and hasn't expired.
   * @param id The user ID.
   */
  get(id: string): Partial<User> | undefined {
    const cached = this.cache.get(id);
    if (!cached) return undefined;

    if (Date.now() > cached.expiry) {
      this.cache.delete(id);
      return undefined;
    }

    return cached.user;
  }

  /**
   * Stores a user in the cache.
   * @param id The user ID.
   * @param user The user object to cache.
   */
  set(id: string, user: Partial<User>): void {
    this.cache.set(id, {
      user,
      expiry: Date.now() + this.TTL,
    });
  }

  /**
   * Invalidates a specific user from the cache.
   * Call this on logout or role/permission updates.
   * @param id The user ID.
   */
  invalidate(id: string): void {
    this.cache.delete(id);
  }
}
