import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../users/entities/user.entity/user.entity';
import { UserCacheService } from '../modules/user-cache.service';
import { hasPermission } from '@virteex/shared/util-auth';

@Injectable()
export class ImpersonationService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly userCacheService: UserCacheService
  ) {}

  async validateImpersonationRequest(adminUser: User, targetUserId: string): Promise<User> {
    const permissions = [...new Set(adminUser.roles.flatMap((role) => role.permissions))];
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
