
import {
  Controller,
  Get,
  UseGuards,
  Patch,
  Param,
  Body,
  Post,
  HttpCode,
  HttpStatus,
  Put,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity/user.entity';
import { UsersService } from './users.service';
import { InviteUserDto } from './entities/user.entity/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return this.usersService.findOne(user.id);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('searchTerm') searchTerm?: string,
    @Query('statusFilter') statusFilter?: string,
    @Query('sortColumn') sortColumn?: string,
    @Query('sortDirection') sortDirection?: 'ASC' | 'DESC',
  ) {
    const options = {
      page: +page,
      pageSize: +pageSize,
      searchTerm,
      statusFilter,
      sortColumn,
      sortDirection,
    };
    return this.usersService.findAllByOrg(user.organizationId, options);
  }


  @Patch(':id')
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: User,
  ) {

    return this.usersService.updateUser(id, updateUserDto, user.organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.usersService.remove(id, user.organizationId);
  }

  @Post('invite')
  async invite(
    @Body() inviteUserDto: InviteUserDto,
    @CurrentUser() user: User,
  ): Promise<User> {



    const organizationId = user.organizationId;
    return this.usersService.inviteUser(inviteUserDto, organizationId);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  async sendPasswordReset(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.usersService.resetPassword(id, user.organizationId);
    return { message: 'Password reset email sent successfully.' };
  }

   @Post(':id/force-logout')
  @HttpCode(HttpStatus.OK)
  async forceLogout(@Param('id') id: string, @CurrentUser() admin: User) {

    return this.usersService.forceLogout(id);
  }

  @Post(':id/block-and-logout')
  @HttpCode(HttpStatus.OK)
  async blockAndLogout(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.usersService.blockAndLogout(id);
  }
  
  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  async setOnlineStatus(
    @Param('id') id: string,
    @Body('isOnline') isOnline: boolean,
  ): Promise<User> {
    return this.usersService.setOnlineStatus(id, isOnline);
  }
}
