import { Inject, forwardRef } from '@nestjs/common';
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException, ParseUUIDPipe } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './create-role.dto';
import { UpdateRoleDto } from './update-role.dto';
import { JwtAuthGuard } from './jwt.guard';
import { CurrentUser } from './current-user.decorator';
import * as jwtPayloadInterface from './jwt-payload.interface';
import { ALL_PERMISSIONS } from './permissions';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(@Inject(forwardRef(() => RolesService)) private readonly rolesService: RolesService) {}

  @Get('available-permissions')
  getAvailablePermissions() {
    return ALL_PERMISSIONS;
  }

  @Post()
  create(@Body() createRoleDto: CreateRoleDto, @CurrentUser() user: jwtPayloadInterface.JwtPayload) {
    return this.rolesService.create(createRoleDto, user.organizationId);
  }

  @Post('clone/:id')
  clone(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: jwtPayloadInterface.JwtPayload) {
    return this.rolesService.cloneRole(id, user.organizationId);
  }

  @Get()
  findAll(@CurrentUser() user: jwtPayloadInterface.JwtPayload) {
    return this.rolesService.findAllByOrg(user.organizationId);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateRoleDto: UpdateRoleDto, @CurrentUser() user: jwtPayloadInterface.JwtPayload) {
    return this.rolesService.update(id, updateRoleDto, user.organizationId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: jwtPayloadInterface.JwtPayload) {
    return this.rolesService.remove(id, user.organizationId);
  }
}