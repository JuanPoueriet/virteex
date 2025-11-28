
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { DimensionsService } from './dimensions.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt/jwt.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity/user.entity';
import { CreateDimensionDto, UpdateDimensionDto } from './dto/dimension.dto';
import { CreateDimensionRuleDto } from './dto/dimension-rule.dto';

@Controller('dimensions')
@UseGuards(JwtAuthGuard)
export class DimensionsController {
  constructor(private readonly dimensionsService: DimensionsService) {}

  @Post()
  create(@Body() createDto: CreateDimensionDto, @CurrentUser() user: User) {
    return this.dimensionsService.create(createDto, user.organizationId);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.dimensionsService.findAll(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.dimensionsService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDimensionDto,
    @CurrentUser() user: User
  ) {
    return this.dimensionsService.update(id, updateDto, user.organizationId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.dimensionsService.remove(id, user.organizationId);
  }




  @Get('rules/:accountId')
  getRulesForAccount(@Param('accountId', ParseUUIDPipe) accountId: string, @CurrentUser() user: User) {
    return this.dimensionsService.getRulesForAccount(accountId, user.organizationId);
  }
  
  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  createRule(@Body() createRuleDto: CreateDimensionRuleDto, @CurrentUser() user: User) {
    return this.dimensionsService.createRule(createRuleDto, user.organizationId);
  }

  @Delete('rules/:accountId/:dimensionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRule(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Param('dimensionId', ParseUUIDPipe) dimensionId: string,
    @CurrentUser() user: User,
  ) {
    return this.dimensionsService.deleteRule(accountId, dimensionId, user.organizationId);
  }



}