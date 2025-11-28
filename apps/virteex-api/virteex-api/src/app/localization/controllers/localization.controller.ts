
import { Controller, Get, Param, Post } from '@nestjs/common';
import { LocalizationService } from '../services/localization.service';
import { Organization } from '../organizations/entities/organization.entity';
import { FiscalRegion } from '../entities/fiscal-region.entity';

@Controller('localization')
export class LocalizationController {
    constructor(private readonly localizationService: LocalizationService) {}


    @Get('fiscal-regions')
    async getFiscalRegions(): Promise<FiscalRegion[]> {
        return this.localizationService.findAllFiscalRegions();
    }


    @Post('apply-package/:organizationId')
    async applyPackage(@Param('organizationId') organizationId: string): Promise<{ message: string }> {
        const mockOrganization = { id: organizationId, fiscalRegionId: 'UUID-DE-LA-REGION' } as Organization;
        await this.localizationService.applyFiscalPackage(mockOrganization);
        return { message: 'Paquete fiscal aplicado (simulación).' };
    }
}