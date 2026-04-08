import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import type { Tax } from '../../taxes/entities/tax.entity';

@Entity({ name: 'tax_groups' })
export class TaxGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  name: string;

  @OneToMany('Tax', 'taxGroup')
  taxes: Tax[];
}