
import { Injectable, Inject, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity/user.entity';
import { UserStatus } from './entities/user.entity/user.entity';
import { InviteUserDto } from './entities/user.entity/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MailService } from '../mail/mail.service';
import { RolesService } from '../roles/roles.service';
import * as crypto from 'crypto';
import { EventsGateway } from '../websockets/events.gateway';
import { UserCacheService } from '../auth/services/user-cache.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventsGateway: EventsGateway,
    private readonly rolesService: RolesService,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => UserCacheService))
    private readonly userCacheService: UserCacheService
  ) {}

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateProfileDto);
    await this.userCacheService.clearUserSession(id);
    return this.userRepository.save(user);
  }

  async findAllByOrg(
    organizationId: string,
    options: {
      page: number;
      pageSize: number;
      searchTerm?: string;
      statusFilter?: string;
      sortColumn?: string;
      sortDirection?: 'ASC' | 'DESC';
    },
  ): Promise<{ data: User[]; total: number }> {
    const {
      page,
      pageSize,
      searchTerm,
      statusFilter,
      sortColumn,
      sortDirection,
    } = options;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    queryBuilder
      .where('user.organizationId = :organizationId', { organizationId })
      .leftJoinAndSelect('user.roles', 'role')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (searchTerm) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :searchTerm OR user.lastName ILIKE :searchTerm OR user.email ILIKE :searchTerm)',
        { searchTerm: `%${searchTerm}%` },
      );
    }

    if (statusFilter && statusFilter !== 'all') {
      queryBuilder.andWhere('user.status = :status', {
        status: statusFilter,
      });
    }

    if (sortColumn && sortDirection) {
      const allowedColumns = [
        'firstName',
        'lastName',
        'email',
        'status',
        'createdAt',
      ];
      if (allowedColumns.includes(sortColumn)) {
        queryBuilder.orderBy(`user.${sortColumn}`, sortDirection);
      }
    } else {
      queryBuilder.orderBy('user.createdAt', 'DESC');
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
    organizationId: string,
  ): Promise<User> {
    const user = await this.userRepository.findOneBy({ id, organizationId });
    if (!user) {
      throw new NotFoundException(
        `Usuario con ID ${id} no encontrado en tu organización.`,
      );
    }

    const { roleId, ...userData } = updateUserDto;

    Object.assign(user, userData);

    if (roleId) {
      const role = await this.rolesService.findOne(roleId, organizationId);
      if (!role) {
        throw new NotFoundException(`Rol con ID ${roleId} no encontrado.`);
      }
      user.roles = [role];
      await this.userCacheService.clearUserSession(id);
    } else {
      await this.userCacheService.clearUserSession(id);
    }

    return this.userRepository.save(user);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id, organizationId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(
        `Usuario con ID ${id} no encontrado en tu organización.`,
      );
    }

    const isSystemUser = user.roles.some((role) => role.isSystemRole);
    if (isSystemUser) {
      throw new ForbiddenException(
        'No se puede eliminar un usuario con un rol de sistema.',
      );
    }

    await this.userCacheService.clearUserSession(id);
    await this.userRepository.remove(user);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: id as any },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }
    return user;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    return user;
  }

  async updateUserStatus(
    id: string,
    status: UserStatus,
    organizationId: string,
  ): Promise<User> {
    const user = await this.userRepository.findOneBy({ id, organizationId });
    if (!user) {
      throw new NotFoundException(`Usuario no encontrado`);
    }
    user.status = status;
    await this.userCacheService.clearUserSession(id);
    return this.userRepository.save(user);
  }

  async resetPassword(id: string, organizationId: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ id, organizationId });
    if (!user) {
      throw new NotFoundException(`Usuario no encontrado`);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.passwordResetExpires = new Date(Date.now() + 3600000);

    await this.userRepository.save(user);
    await this.userCacheService.clearUserSession(id);

    try {
      await this.mailService.sendPasswordResetEmail(user, resetToken, '1h');
    } catch (error) {
      console.error(
        `Failed to send password reset email to ${user.email}`,
        error,
      );

      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await this.userRepository.save(user);

      throw new Error(
        'Could not send password reset email. Please try again later.',
      );
    }
  }

  async getActivityLog(userId: string): Promise<any[]> {
    return [];
  }

  async inviteUser(
    inviteUserDto: InviteUserDto,
    organizationId: string,
  ): Promise<User> {
    const { email, firstName, lastName, roleId } = inviteUserDto;

    const existingUser = await this.userRepository.findOne({
      where: { email, organization: { id: organizationId } },
    });

    if (existingUser) {
      throw new BadRequestException(
        'A user with this email already exists in the organization.',
      );
    }

    const role = await this.rolesService.findOne(roleId, organizationId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found.`);
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date();
    tokenExpires.setDate(tokenExpires.getDate() + 7);

    const newUser = this.userRepository.create({
      firstName,
      lastName,
      email,
      organization: { id: organizationId },
      roles: [role],
      status: UserStatus.PENDING,
      invitationToken: invitationToken,
      invitationTokenExpires: tokenExpires,
    });

    await this.userRepository.save(newUser);
    await this.mailService.sendUserInvitation(newUser, invitationToken);

    delete newUser.invitationToken;
    delete newUser.invitationTokenExpires;

    return newUser;
  }

  async forceLogout(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.tokenVersion += 1;
    await this.userRepository.save(user);
    await this.userCacheService.clearUserSession(userId);

    this.eventsGateway.sendToUser(userId, 'force-logout', {
      reason: 'Su sesión ha sido cerrada por un administrador.',
    });

    return { message: 'Se ha cerrado la sesión del usuario.' };
  }

  async blockAndLogout(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.status = UserStatus.BLOCKED;
    user.tokenVersion += 1;
    await this.userRepository.save(user);
    await this.userCacheService.clearUserSession(userId);

    this.eventsGateway.sendToUser(userId, 'force-logout', {
      reason:
        'Su cuenta ha sido bloqueada y su sesión ha sido cerrada por un administrador.',
    });

    return { message: 'Se ha bloqueado y cerrado la sesión del usuario.' };
  }
  
  async setOnlineStatus(userId: string, isOnline: boolean): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    user.isOnline = isOnline;
    const updatedUser = await this.userRepository.save(user);
    this.eventsGateway.server.emit('user-status-update', { userId, isOnline });
    return updatedUser;
  }

  // --- Auth Abstraction Methods ---

  async findUserForAuth(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('user.organization', 'organization')
      .addSelect('user.twoFactorSecret')
      .addSelect('user.isTwoFactorEnabled')
      .where('user.email = :email', { email })
      .select([
        'user.id',
        'user.email',
        'user.passwordHash',
        'user.status',
        'user.organizationId',
        'user.firstName',
        'user.lastName',
        'user.preferredLanguage',
        'user.failedLoginAttempts',
        'user.lockoutUntil',
        'user.tokenVersion',
        'user.twoFactorSecret',
        'user.isTwoFactorEnabled',
        'user.authProvider',
        'user.authProviderId',
        'user.avatarUrl',
        'role.id',
        'role.name',
        'role.permissions',
        'organization.id',
        'organization.legalName',
        'organization.taxId',
      ])
      .getOne();
  }

  async findUserByIdForAuth(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['roles', 'organization'],
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'status',
        'tokenVersion',
        'organizationId',
        // Minimal fields for strategy validation
      ],
    });
  }

  async save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async update(id: string, partialEntity: any): Promise<void> {
    await this.userRepository.update(id, partialEntity);
  }
}
