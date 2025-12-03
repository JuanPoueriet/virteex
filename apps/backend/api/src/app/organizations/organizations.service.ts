
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationSubsidiary } from './entities/organization-subsidiary.entity';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateSubsidiaryDto } from './dto/create-subsidiary.dto';

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
    // 1. Create the new organization for the subsidiary
    const newOrg = this.organizationRepository.create({
      legalName: createSubsidiaryDto.legalName,
      taxId: createSubsidiaryDto.taxId,
      country: createSubsidiaryDto.country,
      // Default fields
    });
    const savedOrg = await this.organizationRepository.save(newOrg);

    // 2. Create the relationship
    const subsidiary = this.subsidiaryRepository.create({
      parentOrganizationId: parentOrganizationId,
      subsidiaryOrganizationId: savedOrg.id,
      ownership: createSubsidiaryDto.ownership,
    });

    return this.subsidiaryRepository.save(subsidiary);
  }
}
