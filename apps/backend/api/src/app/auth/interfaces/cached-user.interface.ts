import { User } from '@virteex/api/data-access-models';

export interface CachedUser extends User {
  _cachedPermissions?: string[];
}
