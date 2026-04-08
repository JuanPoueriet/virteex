import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { IUserCacheService } from './identity.interfaces';

@Injectable()
export class UserCacheService implements IUserCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
  async clearUserSession(userId: string): Promise<void> {
    await this.cacheManager.del(`user_session:${userId}`);
  }
  async getUser(userId: string): Promise<any | null> {
    return this.cacheManager.get(`user_session:${userId}`);
  }
  async setUser(userId: string, user: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(`user_session:${userId}`, user, ttl);
  }
  async invalidate(userId: string): Promise<void> {
    await this.clearUserSession(userId);
  }
}
