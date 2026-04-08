
import { applyDecorators, UseGuards, SetMetadata } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { Permission } from './permissions';

export const PERMISSIONS_KEY = 'permissions';

export function CheckPermissions(...permissions: Permission[]) {
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    UseGuards(PermissionsGuard),
  );
}