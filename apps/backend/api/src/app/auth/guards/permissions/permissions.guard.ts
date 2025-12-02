import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../../../auth/interfaces/jwt-payload.interface';
import { PERMISSIONS_KEY } from '../../../auth/decorators/permissions.decorator';
import { Permission } from '../../../shared/permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();

    if (!user || !user.permissions) {
        throw new ForbiddenException('No tienes permisos para realizar esta acción.');
    }




    if (user.permissions.includes('*')) {
      return true;
    }


    const hasPermission = requiredPermissions.every((permission) => 
      user.permissions?.includes(permission)
    );

    if (!hasPermission) {
        throw new ForbiddenException('No tienes los permisos necesarios para realizar esta acción.');
    }



    return true;
  }
}