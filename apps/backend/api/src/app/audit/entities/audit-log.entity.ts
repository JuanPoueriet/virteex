import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum ActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index()
  @Column()
  entity: string;

  @Index()
  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ type: 'enum', enum: ActionType })
  actionType: ActionType;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ type: 'jsonb', name: 'previous_value', nullable: true })
  previousValue?: object;

  @Column({ type: 'jsonb', name: 'new_value' })
  newValue: object;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  timestamp: Date;
}