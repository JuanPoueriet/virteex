import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, ActionType } from './entities/audit-log.entity';

@Injectable()
export class AuditTrailService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async record(
    userId: string,
    entity: string,
    entityId: string,
    actionType: ActionType,
    newValue: object,
    previousValue?: object,
    ipAddress?: string,
  ): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      userId,
      entity,
      entityId,
      actionType,
      newValue,
      previousValue,
      ipAddress,
    });
    await this.auditLogRepository.save(auditLog);
  }

  async find(entity?: string, entityId?: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
        where: {
            ...(entity && { entity }),
            ...(entityId && { entityId }),
        },
        order: {
            timestamp: 'DESC'
        }
    });
  }
}