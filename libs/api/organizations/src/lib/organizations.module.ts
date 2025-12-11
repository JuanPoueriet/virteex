import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '@virteex/api/data-access-models';
import { OrganizationSettings } from '@virteex/api/data-access-models';
import { OrganizationSubsidiary } from '@virteex/api/data-access-models';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationSettings,
      OrganizationSubsidiary
    ])
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService]
})
export class OrganizationsModule {}
