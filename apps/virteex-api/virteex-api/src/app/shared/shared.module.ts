






import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentSequence } from './document-sequences/entities/document-sequence.entity';
import { DocumentSequencesService } from './document-sequences/document-sequences.service';
import { OrganizationSubscriber } from './subscribers/organization.subscriber';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentSequence])
  ], 
  providers: [
    DocumentSequencesService,
    OrganizationSubscriber
  ],
  exports: [
    DocumentSequencesService,
    OrganizationSubscriber
  ],
})
export class SharedModule {}