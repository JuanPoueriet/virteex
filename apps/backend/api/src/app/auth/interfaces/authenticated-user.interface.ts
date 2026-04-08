import { Organization } from '../../organizations/entities/organization.entity';
import { Role } from '../../roles/entities/role.entity';
import { User } from '../../users/entities/user.entity/user.entity';

export interface SafeUser extends Partial<Omit<User, 'password' | 'twoFactorSecret'>> {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  permissions: string[];
  organization?: Organization;
  organizationId: string;
  isTwoFactorEnabled?: boolean;
}

export interface AuthenticatedUser extends SafeUser {
  isImpersonating?: boolean;
  originalUserId?: string;
}
