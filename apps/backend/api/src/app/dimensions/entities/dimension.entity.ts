
import { Organization } from '../../organizations/entities/organization.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import type { DimensionValue } from './dimension-value.entity';

@Entity({ name: 'dimensions' })
@Index(['organizationId', 'name'], { unique: true })
export class Dimension {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany('DimensionValue', 'dimension', { cascade: true })
  values: DimensionValue[];
}
