
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class UserCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async clearUserSession(userId: string): Promise<void> {
    await this.cacheManager.del(`user_session:${userId}`);
  }

  async clearUserSessionByEmail(email: string): Promise<void> {
    // This is harder as we key by ID. We usually clear by ID.
    // If we only have email, we might need to find ID first, but this service is low-level.
    // We will assume ID is available or fetched before calling this.
  }
}
