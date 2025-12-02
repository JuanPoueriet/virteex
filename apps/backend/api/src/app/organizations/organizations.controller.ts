
import { Controller, Get, Body, Patch, UseGuards, Put } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt/jwt.guard';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './entities/organization.entity';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: User) {
    return this.organizationsService.findOne(user.organizationId);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(user.organizationId, updateOrganizationDto);
  }
}
