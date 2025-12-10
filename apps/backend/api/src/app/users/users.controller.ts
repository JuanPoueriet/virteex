
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, UseFilters, ParseUUIDPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { InviteUserDto } from './entities/user.entity/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt/jwt.guard';
import { PermissionsGuard } from '../auth/guards/permissions/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserStatus } from './entities/user.entity/user.entity';
import { UserResponseDto } from '../auth/dto/user-response.dto';
import { plainToInstance } from 'class-transformer';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { IsOrganizationOwner } from '../auth/policies/is-organization-owner.policy';
import { TypeOrmExceptionFilter } from '../common/filters/typeorm-exception.filter';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JobTitle } from './enums/job-title.enum';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseFilters(TypeOrmExceptionFilter)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('job-titles')
  @ApiOperation({ summary: 'Get list of available job titles' })
  getJobTitles() {
    return Object.values(JobTitle);
  }

  @Post('invite')
  @Permissions('users.create')
  @ApiOperation({ summary: 'Invite a new user to the organization' })
  async inviteUser(
    @Body() inviteUserDto: InviteUserDto,
    @CurrentUser() user: User,
  ) {
    const newUser = await this.usersService.inviteUser(
      inviteUserDto,
      user.organizationId,
    );
    return plainToInstance(UserResponseDto, newUser, { excludeExtraneousValues: true });
  }

  @Get()
  @Permissions('users.view')
  @ApiOperation({ summary: 'List users in organization' })
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Query('search') search = '',
    @Query('status') status = 'all',
    @Query('sortColumn') sortColumn = 'createdAt',
    @Query('sortDirection') sortDirection: 'ASC' | 'DESC' = 'DESC',
  ) {
    const { data, total } = await this.usersService.findAllByOrg(
      user.organizationId,
      {
        page,
        pageSize,
        searchTerm: search,
        statusFilter: status,
        sortColumn,
        sortDirection,
      },
    );

    return {
      data: plainToInstance(UserResponseDto, data, { excludeExtraneousValues: true }),
      total,
      page,
      pageSize,
    };
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: User) {
    const fullUser = await this.usersService.findOne(user.id);
    return plainToInstance(UserResponseDto, fullUser, { excludeExtraneousValues: true });
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const updatedUser = await this.usersService.updateProfile(
      user.id,
      updateProfileDto,
    );
    return plainToInstance(UserResponseDto, updatedUser, { excludeExtraneousValues: true });
  }

  @Get(':id')
  @Permissions('users.view')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    // Ideally ensure user belongs to same org
    const foundUser = await this.usersService.findOne(id);
    return plainToInstance(UserResponseDto, foundUser, { excludeExtraneousValues: true });
  }

  @Patch(':id')
  @Permissions('users.edit')
  @ApiOperation({ summary: 'Update user (Admin)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: User,
  ) {
    const updatedUser = await this.usersService.updateUser(
      id,
      updateUserDto,
      user.organizationId,
    );
    return plainToInstance(UserResponseDto, updatedUser, { excludeExtraneousValues: true });
  }

  @Delete(':id')
  @Permissions('users.delete')
  @CheckPermissions(IsOrganizationOwner)
  @ApiOperation({ summary: 'Remove user' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.usersService.remove(id, user.organizationId);
  }

  @Patch(':id/status')
  @Permissions('users.edit')
  async updateStatus(
      @Param('id', ParseUUIDPipe) id: string,
      @Body('status') status: UserStatus,
      @CurrentUser() user: User
  ) {
      const updatedUser = await this.usersService.updateUserStatus(id, status, user.organizationId);
      return plainToInstance(UserResponseDto, updatedUser, { excludeExtraneousValues: true });
  }

  @Post(':id/reset-password')
  @Permissions('users.edit')
  async resetPassword(
      @Param('id', ParseUUIDPipe) id: string,
      @CurrentUser() user: User
  ) {
      await this.usersService.resetPassword(id, user.organizationId);
      return { message: 'Password reset email sent.' };
  }

  @Get(':id/activity')
  @Permissions('users.view')
  async getActivityLog(@Param('id', ParseUUIDPipe) id: string) {
      return this.usersService.getActivityLog(id);
  }

  @Post(':id/force-logout')
  @Permissions('users.edit')
  async forceLogout(@Param('id', ParseUUIDPipe) id: string) {
      return this.usersService.forceLogout(id);
  }
}
