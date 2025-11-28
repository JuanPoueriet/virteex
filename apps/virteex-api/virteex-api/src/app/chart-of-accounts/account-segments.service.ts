
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AccountSegmentDefinition } from './entities/account-segment-definition.entity';
import { ConfigureAccountSegmentsDto } from './dto/account-segment-definition.dto';

@Injectable()
export class AccountSegmentsService {
  constructor(
    @InjectRepository(AccountSegmentDefinition)
    private readonly segmentDefinitionRepository: Repository<AccountSegmentDefinition>,
    private readonly dataSource: DataSource,
  ) {}

  findByOrg(organizationId: string): Promise<AccountSegmentDefinition[]> {
    return this.segmentDefinitionRepository.find({
      where: { organizationId },
      order: { order: 'ASC' },
    });
  }

  async configure(dto: ConfigureAccountSegmentsDto, organizationId: string): Promise<AccountSegmentDefinition[]> {
    return this.dataSource.transaction(async manager => {
        const repo = manager.getRepository(AccountSegmentDefinition);
        






        await repo.delete({ organizationId });

        const definitions = dto.segments.map((segmentDto, index) => {
            return repo.create({
                ...segmentDto,
                organizationId,
                order: index,
            });
        });

        return repo.save(definitions);
    });
  }
}