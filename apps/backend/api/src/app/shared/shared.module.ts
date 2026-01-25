import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentSequence } from './document-sequences/entities/document-sequence.entity';
import { DocumentSequencesService } from './document-sequences/document-sequences.service';
import { OrganizationSubscriber } from './subscribers/organization.subscriber';
import { CryptoUtil } from './utils/crypto.util';
import { TemplateService } from './template/template.service';
import { PdfService } from './pdf/pdf.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentSequence])
  ], 
  providers: [
    DocumentSequencesService,
    OrganizationSubscriber,
    CryptoUtil,
    TemplateService,
    PdfService
  ],
  exports: [
    DocumentSequencesService,
    OrganizationSubscriber,
    CryptoUtil,
    TemplateService,
    PdfService
  ],
})
export class SharedModule {}
