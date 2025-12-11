
import { Controller, Get, Body, Patch, UseGuards, Put } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CheckPermissions, CurrentUser, AuthenticatedUser, IsOrganizationOwnerPolicy } from '@virteex/api/auth-shared';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateSubsidiaryDto } from './dto/create-subsidiary.dto';
import { Organization } from '@virteex/api/data-access-models';
import { Post } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('organizations')
@UseGuards(AuthGuard('jwt'))
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    // AuthenticatedUser.organization.id is strictly typed now
    if (!user.organization) throw new Error('User does not belong to an organization');
    return this.organizationsService.findOne(user.organization.id);
  }

  @Patch('profile')
  @CheckPermissions(IsOrganizationOwnerPolicy)
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    if (!user.organization) throw new Error('User does not belong to an organization');
    return this.organizationsService.update(user.organization.id, updateOrganizationDto);
  }

  @Get('subsidiaries')
  async getSubsidiaries(@CurrentUser() user: AuthenticatedUser) {
    if (!user.organization) throw new Error('User does not belong to an organization');
    return this.organizationsService.getSubsidiaries(user.organization.id);
  }

  @Post('subsidiaries')
  async createSubsidiary(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createSubsidiaryDto: CreateSubsidiaryDto,
  ) {
    if (!user.organization) throw new Error('User does not belong to an organization');
    return this.organizationsService.createSubsidiary(user.organization.id, createSubsidiaryDto);
  }
}
