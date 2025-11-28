
import { Controller, Post, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Body, UseGuards, Get, Param, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReconciliationService } from './reconciliation.service';
import { UploadStatementDto } from './dto/upload-statement.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/guards/jwt/jwt.guard';

@Controller('reconciliation')
@UseGuards(JwtAuthGuard)
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadStatement(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'text/csv' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() uploadStatementDto: UploadStatementDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reconciliationService.processStatementUpload(
      file,
      uploadStatementDto,
      user.organizationId,
    );
  }

  @Get('statements/:accountId')
  getStatementsForAccount(
    @Param('accountId') accountId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reconciliationService.getStatements(accountId, user.organizationId);
  }

  @Get('view/:statementId')
  getReconciliationView(
    @Param('statementId') statementId: string,
    @CurrentUser() user: JwtPayload,
  ) {

    return this.reconciliationService.getReconciliationView(
      statementId,
      user.organizationId,
    );
  }
}