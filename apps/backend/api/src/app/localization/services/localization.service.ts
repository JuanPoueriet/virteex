
import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { FiscalRegion } from '../entities/fiscal-region.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { ChartOfAccountsService } from '../../chart-of-accounts/chart-of-accounts.service';
import { TaxesService } from '../../taxes/taxes.service';
import { panamaCoaTemplate } from '../templates/pa-coa.template';
import { panamaTaxTemplate } from '../templates/pa-taxes.template';
import { AccountTemplateDto } from '../entities/coa-template.entity';
import { usGaapCoaTemplate } from '../templates/us-gaap-coa.template';
import { FiscalStrategy } from '../drivers/fiscal-strategy.interface';
import { DominicanRepublicStrategy } from '../drivers/dominican-republic/dominican-republic.strategy';
import { GenericFiscalStrategy } from '../drivers/generic-fiscal.strategy';

@Injectable()
export class LocalizationService implements OnModuleInit {
  private readonly logger = new Logger(LocalizationService.name);
  private strategies: Map<string, FiscalStrategy> = new Map();

  constructor(
    @InjectRepository(FiscalRegion)
    private readonly fiscalRegionRepository: Repository<FiscalRegion>,
    private readonly coaService: ChartOfAccountsService,
    private readonly taxesService: TaxesService,
    private readonly doStrategy: DominicanRepublicStrategy,
    private readonly genericStrategy: GenericFiscalStrategy
  ) {
    this.strategies.set('DO', this.doStrategy);
    this.strategies.set('GENERIC', this.genericStrategy);
  }

  async onModuleInit() {
    await this.seedFiscalRegions();
  }

  getStrategy(countryCode: string): FiscalStrategy {
    return this.strategies.get(countryCode) || this.strategies.get('GENERIC');
  }

  async findAllFiscalRegions(): Promise<FiscalRegion[]> {
    return this.fiscalRegionRepository.find({ order: { name: 'ASC' } });
  }

  async findRegionByCountryCode(countryCode: string): Promise<FiscalRegion | null> {
      return this.fiscalRegionRepository.findOne({ where: { countryCode }});
  }

  private async seedFiscalRegions() {
    const regions = [
      { countryCode: 'DO', name: 'República Dominicana', baseCurrency: 'DOP' },
      { countryCode: 'PA', name: 'Panamá', baseCurrency: 'PAB' },
      { countryCode: 'CR', name: 'Costa Rica', baseCurrency: 'CRC' },
      { countryCode: 'CO', name: 'Colombia', baseCurrency: 'COP' },
      { countryCode: 'PE', name: 'Perú', baseCurrency: 'PEN' },
      { countryCode: 'CL', name: 'Chile', baseCurrency: 'CLP' },
      { countryCode: 'MX', name: 'México', baseCurrency: 'MXN' },
      { countryCode: 'US', name: 'United States (US GAAP)', baseCurrency: 'USD' },
    ];

    for (const regionData of regions) {
      const regionExists = await this.fiscalRegionRepository.findOne({
        where: { countryCode: regionData.countryCode },
      });
      if (!regionExists) {
        this.logger.log(
          `Sembrando región fiscal para ${regionData.name} (${regionData.countryCode})...`,
        );
        await this.fiscalRegionRepository.save(regionData);
      }
    }
  }

  async applyFiscalPackage(organization: Organization, manager?: EntityManager) {
    if (!organization.fiscalRegionId) {
      this.logger.warn(
        `La organización ${organization.id} no tiene una región fiscal asignada. Omitiendo la aplicación del paquete fiscal.`,
      );
      return;
    }

    const regionRepo = manager ? manager.getRepository(FiscalRegion) : this.fiscalRegionRepository;
    const region = await regionRepo.findOneBy({
      id: organization.fiscalRegionId,
    });

    if (!region) {
      throw new NotFoundException(
        `Región fiscal con ID "${organization.fiscalRegionId}" no encontrada.`,
      );
    }

    this.logger.log(
      `Aplicando paquete fiscal de ${region.name} para la organización ${organization.id}`,
    );

    switch (region.countryCode) {
      case 'PA':
        await this.applyPanamaPackage(organization.id, manager);
        break;
      case 'US':
        // Reuse generic for US for now
        await this.applyGenericCoaTemplate(organization.id, usGaapCoaTemplate.accounts, manager);
        break;
      case 'DO':
        // For Dominican Republic, we use a generic template for now until a specific one is defined
        // In a real scenario, we would load `drCoaTemplate`
        await this.applyGenericCoaTemplate(organization.id, usGaapCoaTemplate.accounts, manager);
        break;
      default:
        this.logger.warn(
          `No hay un paquete fiscal definido para el código de país: ${region.countryCode}. Usando genérico.`,
        );
        await this.applyGenericCoaTemplate(organization.id, usGaapCoaTemplate.accounts, manager);
    }
  }

  private async applyPanamaPackage(organizationId: string, manager?: EntityManager) {
    this.logger.log(
      `Aplicando impuestos de Panamá para la organización ${organizationId}...`,
    );
    for (const tax of panamaTaxTemplate.taxes) {
      await this.taxesService.create(tax, organizationId, manager);
    }
  }

  private async applyGenericCoaTemplate(organizationId: string, accounts: AccountTemplateDto[], manager?: EntityManager) {
    this.logger.log(`Aplicando plantilla de plan de cuentas para la organización ${organizationId}...`);
    for (const account of accounts) {
      await this.createAccountFromTemplate(account, organizationId, null, manager);
    }
  }

  private async createAccountFromTemplate(
    accountDto: AccountTemplateDto,
    organizationId: string,
    parentId: string | null,
    manager?: EntityManager
  ) {
    const { children, ...createAccountDto } = accountDto;

    const createdAccount = await this.coaService.create(
      {
        ...createAccountDto,
        parentId,
      },
      organizationId,
      manager
    );

    if (children && children.length > 0) {
      for (const child of children) {
        await this.createAccountFromTemplate(
          child,
          organizationId,
          createdAccount.id,
          manager
        );
      }
    }
  }
}
