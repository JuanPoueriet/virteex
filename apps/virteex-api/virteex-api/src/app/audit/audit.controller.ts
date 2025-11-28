import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt/jwt.guard';
import { AuditTrailService } from './audit.service';



@Controller('audit')
@UseGuards(JwtAuthGuard)

export class AuditController {
  constructor(private readonly auditTrailService: AuditTrailService) {}

  @Get()

  findAll(@Query('entity') entity?: string, @Query('entityId') entityId?: string) {
    return this.auditTrailService.find(entity, entityId);
  }
}