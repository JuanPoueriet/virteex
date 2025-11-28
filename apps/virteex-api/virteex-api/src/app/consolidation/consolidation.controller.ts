
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt/jwt.guard';
import { ConsolidationService } from './consolidation.service';
import { RunConsolidationDto } from './dto/run-consolidation.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity/user.entity';
import { HasPermission } from 'src/auth/decorators/permissions.decorator';
import { PERMISSIONS } from 'src/shared/permissions';

@Controller('consolidation')
@UseGuards(JwtAuthGuard)
export class ConsolidationController {
  constructor(private readonly consolidationService: ConsolidationService) {}

  @Post('run')
  @HasPermission(PERMISSIONS.FINANCIALS_CONSOLIDATE)
  runConsolidation(
    @Body() runDto: RunConsolidationDto,
    @CurrentUser() user: User,
  ) {
    const asOfDate = new Date(runDto.asOfDate);
    return this.consolidationService.runConsolidation(user.organizationId, asOfDate);
  }
}