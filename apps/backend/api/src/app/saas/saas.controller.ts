import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SaasService } from './saas.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Request } from 'express';

@Controller('saas')
export class SaasController {
  constructor(private readonly saasService: SaasService) {}

  @Get('plans')
  getPlans() {
    return this.saasService.getPlans();
  }

  @Get('usage')
  @UseGuards(AuthGuard('jwt'))
  async getUsage(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    if (!user.organization) {
        return [];
    }
    return this.saasService.getUsage(user.organization.id);
  }

  @Get('subscription')
  @UseGuards(AuthGuard('jwt'))
  async getSubscription(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    if (!user.organization) {
        return null;
    }
    return this.saasService.getSubscription(user.organization.id);
  }
}
