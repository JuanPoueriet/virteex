
import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt/jwt.guard';
import { CurrentUser } from '@virteex/api/auth-shared';
import { User } from '@virteex/api/data-access-models';
import { RunInflationAdjustmentDto } from './dto/run-inflation-adjustment.dto';
import { InflationAdjustmentService } from './inflation-adjustment.service';
import { HasPermission } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS, Permission, ALL_PERMISSIONS } from '@virteex/api/auth-shared';

@Controller('accounting/inflation-adjustment')
@UseGuards(JwtAuthGuard)
export class InflationAdjustmentController {
  constructor(private readonly adjustmentService: InflationAdjustmentService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @HasPermission(PERMISSIONS.ACCOUNTING_RUN_INFLATION_ADJUSTMENT)
  async run(@Body() dto: RunInflationAdjustmentDto, @CurrentUser() user: User) {
    await this.adjustmentService.runAdjustment(dto.year, dto.month, user.organizationId);
    return { message: 'Proceso de ajuste por inflación ejecutado exitosamente.' };
  }
}