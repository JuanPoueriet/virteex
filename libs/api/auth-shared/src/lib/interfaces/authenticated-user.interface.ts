import { Role, Organization } from '@virteex/api/data-access-models';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  permissions?: string[];
  organization?: Organization;
  isTwoFactorEnabled?: boolean;
  isImpersonating?: boolean;
  originalUserId?: string;
}
