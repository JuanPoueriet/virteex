import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt/jwt.guard';
import { CurrentUser } from '@virteex/api/auth-shared';
import { User } from '@virteex/api/data-access-models';
import { CasesService } from './cases.service';

@Controller('cases')
@UseGuards(JwtAuthGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.casesService.findAll(user.organizationId);
  }
}