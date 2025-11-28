
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt/jwt.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity/user.entity';
import { AccountSegmentsService } from './account-segments.service';
import { ConfigureAccountSegmentsDto } from './dto/account-segment-definition.dto';

@Controller('chart-of-accounts/segment-definitions')
@UseGuards(JwtAuthGuard)
export class AccountSegmentsController {
  constructor(private readonly segmentsService: AccountSegmentsService) {}

  @Get()
  getDefinitions(@CurrentUser() user: User) {
    return this.segmentsService.findByOrg(user.organizationId);
  }

  @Post()
  configureSegments(@Body() dto: ConfigureAccountSegmentsDto, @CurrentUser() user: User) {
    return this.segmentsService.configure(dto, user.organizationId);
  }
}