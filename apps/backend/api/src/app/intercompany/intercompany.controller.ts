
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt/jwt.guard';
import { CurrentUser } from '@virteex/api/auth-shared';
import { User } from '@virteex/api/data-access-models';
import { IntercompanyService } from './intercompany.service';
import { CreateIntercompanyTransactionDto } from './dto/create-intercompany-transaction.dto';

@Controller('intercompany')
@UseGuards(JwtAuthGuard)
export class IntercompanyController {
  constructor(private readonly intercompanyService: IntercompanyService) {}

  @Post('transactions')
  createTransaction(@Body() dto: CreateIntercompanyTransactionDto, @CurrentUser() user: User) {
    return this.intercompanyService.create(dto, user.organizationId);
  }
}