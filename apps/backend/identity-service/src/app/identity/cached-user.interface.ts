import { User } from './user.entity';

export interface CachedUser extends User {
  _cachedPermissions?: string[];
}
