
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import type { FiscalRegion } from './fiscal-region.entity';
import type { CoaTemplate } from './coa-template.entity';
import type { TaxTemplate } from './tax-template.entity';

@Entity({ name: 'localization_templates' })
export class LocalizationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => FiscalRegion)
  @JoinColumn({ name: 'fiscal_region_id' })
  fiscalRegion: FiscalRegion;

  @Column({ name: 'fiscal_region_id' })
  fiscalRegionId: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany('CoaTemplate', 'template', { cascade: true })
  coaTemplate: CoaTemplate[];

  @OneToMany('TaxTemplate', 'template', { cascade: true })
  taxTemplates: TaxTemplate[];
}