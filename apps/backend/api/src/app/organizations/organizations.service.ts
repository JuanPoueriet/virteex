
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationSubsidiary } from './entities/organization-subsidiary.entity';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateSubsidiaryDto } from './dto/create-subsidiary.dto';
import { AccountSegmentDefinition } from '../chart-of-accounts/entities/account-segment-definition.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationSubsidiary)
    private readonly subsidiaryRepository: Repository<OrganizationSubsidiary>,
  ) {}

  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOneBy({ id });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    return organization;
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto): Promise<Organization> {
    const organization = await this.findOne(id);
    Object.assign(organization, updateOrganizationDto);
    return this.organizationRepository.save(organization);
  }

  async getSubsidiaries(organizationId: string): Promise<OrganizationSubsidiary[]> {
    return this.subsidiaryRepository.find({
      where: { parentOrganizationId: organizationId },
      relations: ['subsidiary'],
    });
  }

  async createSubsidiary(parentOrganizationId: string, createSubsidiaryDto: CreateSubsidiaryDto): Promise<OrganizationSubsidiary> {
    return this.organizationRepository.manager.transaction(async (manager) => {
      // 1. Create the new organization for the subsidiary
      const newOrg = manager.create(Organization, {
        legalName: createSubsidiaryDto.legalName,
        taxId: createSubsidiaryDto.taxId,
        country: createSubsidiaryDto.country,
        // Default fields
      });
      const savedOrg = await manager.save(newOrg);

      // 2. Initialize segment definitions
      await this.createDefaultSegmentDefinitions(savedOrg.id, manager);

      // 3. Create the relationship
      const subsidiary = manager.create(OrganizationSubsidiary, {
        parentOrganizationId: parentOrganizationId,
        subsidiaryOrganizationId: savedOrg.id,
        ownership: createSubsidiaryDto.ownership,
      });

      return manager.save(subsidiary);
    });
  }

  async create(createOrganizationDto: Partial<Organization>, manager?: EntityManager): Promise<Organization> {
    if (manager) {
      const org = manager.create(Organization, createOrganizationDto);
      const savedOrg = await manager.save(org);
      await this.createDefaultSegmentDefinitions(savedOrg.id, manager);
      return savedOrg;
    }

    return this.organizationRepository.manager.transaction(async (m) => {
      const org = m.create(Organization, createOrganizationDto);
      const savedOrg = await m.save(org);
      await this.createDefaultSegmentDefinitions(savedOrg.id, m);
      return savedOrg;
    });
  }

  private async createDefaultSegmentDefinitions(organizationId: string, manager: EntityManager): Promise<void> {
    const segmentRepo = manager.getRepository(AccountSegmentDefinition);

    const defaults = [
      { name: 'Nivel 1', length: 1, isRequired: true, order: 0 },
      { name: 'Nivel 2', length: 2, isRequired: true, order: 1 },
      { name: 'Nivel 3', length: 2, isRequired: true, order: 2 },
      { name: 'Nivel 4', length: 3, isRequired: true, order: 3 },
    ];

    const definitions = defaults.map((d) =>
      segmentRepo.create({
        ...d,
        organizationId,
      }),
    );

    await segmentRepo.save(definitions);
  }

  async findByTaxId(taxId: string): Promise<Organization | null> {
    return this.organizationRepository.findOneBy({ taxId });
  }
}
