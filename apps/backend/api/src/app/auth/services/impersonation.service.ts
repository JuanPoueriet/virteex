import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../users/entities/user.entity/user.entity';
import { UserCacheService } from '../modules/user-cache.service';
import { hasPermission } from '@virteex/shared/util-auth';
import { RoleEnum } from '../../roles/enums/role.enum';

const ROLE_HIERARCHY: Record<string, number> = {
  [RoleEnum.ADMINISTRATOR]: 100,
  [RoleEnum.ACCOUNTANT]: 50,
  [RoleEnum.SELLER]: 50,
  [RoleEnum.MEMBER]: 10,
};

@Injectable()
export class ImpersonationService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly userCacheService: UserCacheService
  ) {}

  private getRoleLevel(roles: { name: string }[]): number {
    const safeRoles = roles || [];
    return Math.max(0, ...safeRoles.map(r => ROLE_HIERARCHY[r.name] || 0));
  }

  async validateImpersonationRequest(adminUser: User, targetUserId: string): Promise<User> {
    const permissions = [...new Set((adminUser.roles || []).flatMap((role) => role.permissions || []))];
    if (!hasPermission(permissions, ['users:impersonate'])) {
      throw new ForbiddenException(
        'No tienes permisos para suplantar usuarios.',
      );
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId, organizationId: adminUser.organizationId },
      relations: ['roles', 'organization'],
    });
    if (!targetUser) {
      throw new NotFoundException(
        'El usuario a suplantar no fue encontrado en tu organización.',
      );
    }

    const adminLevel = this.getRoleLevel(adminUser.roles);
    const targetLevel = this.getRoleLevel(targetUser.roles);

    if (targetLevel > adminLevel) {
      throw new ForbiddenException(
        'No tienes jerarquía suficiente para suplantar a este usuario.',
      );
    }

    return targetUser;
  }

  async validateStopImpersonation(impersonatingUser: User): Promise<User> {
     if (
      !impersonatingUser.isImpersonating ||
      !impersonatingUser.originalUserId
    ) {
      throw new BadRequestException(
        'No se encontró una sesión de suplantación activa para detener.',
      );
    }

    const adminUser = await this.userRepository.findOne({
      where: { id: impersonatingUser.originalUserId },
      relations: ['roles', 'organization'],
    });

    if (!adminUser) {
      throw new NotFoundException(
        'La cuenta del administrador original no fue encontrada.',
      );
    }
    if (adminUser.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'La cuenta del administrador original ya no está activa.',
      );
    }

    // Invalidate the impersonation session cache
    await this.userCacheService.clearUserSession(impersonatingUser.id);

    return adminUser;
  }
}
