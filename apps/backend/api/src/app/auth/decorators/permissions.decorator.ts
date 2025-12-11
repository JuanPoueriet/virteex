
import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY, Permission } from '@virteex/api/auth-shared';

export { PERMISSIONS_KEY };
export const HasPermission = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
