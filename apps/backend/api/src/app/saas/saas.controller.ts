import { Controller, Get } from '@nestjs/common';
import { SaasService } from './saas.service';

@Controller('saas')
export class SaasController {
  constructor(private readonly saasService: SaasService) {}

  @Get('plans')
  getPlans() {
    return this.saasService.getPlans();
  }
}
