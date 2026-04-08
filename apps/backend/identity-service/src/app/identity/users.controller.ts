import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Inject, ParseUUIDPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IUsersService } from './identity.interfaces';
import { USERS_SERVICE_TOKEN } from './identity.constants';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    @Inject(USERS_SERVICE_TOKEN)
    private readonly usersService: IUsersService
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get profile' })
  async getProfile(@Req() req: any) {
    return { id: '1', email: 'test@example.com' };
  }
}
