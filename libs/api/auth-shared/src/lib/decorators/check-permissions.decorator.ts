
import { applyDecorators, UseGuards, SetMetadata } from '@nestjs/common';
import { Type } from '@nestjs/common';
import { PermissionsGuard } from '../guards/permissions.guard';
import { Permission } from '../permissions';

// Re-export IPolicy here or in guards?
// PermissionsGuard defines IPolicy locally in original file.
// I should move IPolicy to a separate file or keep it in Guard or here.
// In shared lib, I defined IPolicy in decorator file earlier.
// I will keep it here.

export interface IPolicy {
    can(user: any, request: any): boolean | Promise<boolean>;
}

export const PERMISSIONS_KEY = 'permissions';

export function CheckPermissions(...requirements: (Permission | string | Type<IPolicy>)[]) {
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, requirements),
    UseGuards(PermissionsGuard),
  );
}

// Support legacy string permissions if needed, but Permission type covers strings.
