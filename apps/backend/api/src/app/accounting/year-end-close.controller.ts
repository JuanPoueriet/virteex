
import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt/jwt.guard';
import { CurrentUser } from '@virteex/api/auth-shared';
import { User } from '@virteex/api/data-access-models';
import { YearEndCloseService } from './year-end-close.service';
import { YearEndCloseDto } from './dto/year-end-close.dto';

@Controller('accounting/year-end-close')
@UseGuards(JwtAuthGuard)
export class YearEndCloseController {
  constructor(private readonly yearEndCloseService: YearEndCloseService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async closePeriod(
    @Body() closeDto: YearEndCloseDto,
    @CurrentUser() user: User,
  ) {
    const closedYear = await this.yearEndCloseService.closeFiscalYear(
      closeDto,
      user.organizationId,
    );
    return {
      message: `El año fiscal que termina en ${closedYear.endDate.toISOString().split('T')[0]} ha sido cerrado exitosamente.`,
      fiscalYear: closedYear,
    };
  }
}