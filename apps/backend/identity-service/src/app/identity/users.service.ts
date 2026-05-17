import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserStatus } from './user.entity';
import { InviteUserDto } from './invite-user.dto';
import { UpdateUserDto } from './update-user.dto';
import { UpdateProfileDto } from './update-profile.dto';
import { IUsersService, IRolesService, IUserCacheService } from './identity.interfaces';
import { ROLES_SERVICE_TOKEN, USER_CACHE_SERVICE_TOKEN } from './identity.constants';
import * as crypto from 'crypto';

@Injectable()
export class UsersService implements IUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(ROLES_SERVICE_TOKEN)
    private readonly rolesService: IRolesService,
    @Inject(USER_CACHE_SERVICE_TOKEN)
    private readonly userCacheService: IUserCacheService,
    @Inject('MailNotifier')
    private readonly mailService: any,
    @Inject('SaasPlanReader')
    private readonly saasService: any,
    private readonly dataSource: DataSource
  ) {}

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.findOne(id);
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      user.isEmailVerified = false;
    }
    if (updateProfileDto.phone && updateProfileDto.phone !== user.phone) {
      user.isPhoneVerified = false;
    }
    Object.assign(user, updateProfileDto);
    await this.userCacheService.clearUserSession(id);
    return this.userRepository.save(user);
  }

  async findAllByOrg(organizationId: string, options: any): Promise<{ data: User[]; total: number }> {
    const { page, pageSize, searchTerm, statusFilter, sortColumn, sortDirection } = options;
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
      queryBuilder.andWhere('user.status = :status', { status: statusFilter });
    }

    if (sortColumn && sortDirection) {
        queryBuilder.orderBy(`user.${sortColumn}`, sortDirection);
    }

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto, organizationId: string): Promise<User> {
    const user = await this.userRepository.findOne({
        where: { id, organizationId },
        relations: ['security']
    });
    if (!user) throw new NotFoundException('User not found');

    const { roleId, ...userData } = updateUserDto;
    Object.assign(user, userData);

    if (roleId) {
      const role = await this.rolesService.findOne(roleId, organizationId);
      user.roles = [role];
      if (user.security) user.security.tokenVersion = (user.security.tokenVersion || 0) + 1;
    }
    await this.userCacheService.clearUserSession(id);
    return this.userRepository.save(user);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id, organizationId }, relations: ['roles'] });
    if (!user) throw new NotFoundException('User not found');
    await this.userCacheService.clearUserSession(id);
    await this.userRepository.remove(user);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email }, relations: ['security', 'roles'] });
  }

  async updateUserStatus(id: string, status: UserStatus, organizationId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id, organizationId }, relations: ['security'] });
    if (!user) throw new NotFoundException('User not found');
    user.status = status;
    if (user.security) user.security.tokenVersion = (user.security.tokenVersion || 0) + 1;
    await this.userCacheService.clearUserSession(id);
    return this.userRepository.save(user);
  }

  async inviteUser(inviteUserDto: InviteUserDto, organizationId: string): Promise<User> {
    const { email, firstName, lastName, roleId } = inviteUserDto;
    const role = await this.rolesService.findOne(roleId, organizationId);
    const newUser = this.userRepository.create({
      firstName, lastName, email, organizationId, roles: [role],
      status: UserStatus.PENDING,
      security: { tokenVersion: 1 } as any
    });

    return this.dataSource.transaction(async (manager) => {
        await this.saasService.enforceLimit(organizationId, 'USERS', manager);
        await manager.save(newUser);
        await this.mailService.sendUserInvitation(newUser, 'token');
        return newUser;
    });
  }

  async save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }
}
