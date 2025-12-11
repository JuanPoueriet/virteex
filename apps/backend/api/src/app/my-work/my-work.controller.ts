import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@virteex/api/auth-shared';
import { JwtAuthGuard } from '../auth/guards/jwt/jwt.guard';
import { User } from '@virteex/api/data-access-models';
import { MyWorkDto } from './dto/my-work.dto';
import { MyWorkService } from './my-work.service';

@ApiTags('My Work')
@Controller('my-work')
@UseGuards(JwtAuthGuard)
export class MyWorkController {
  constructor(private readonly myWorkService: MyWorkService) {}

  @Get()
  @ApiOkResponse({ type: MyWorkDto })
  getMyWork(@CurrentUser() user: User): Promise<MyWorkDto> {
    return this.myWorkService.getWorkItems(user.id, user.organizationId);
  }
}
