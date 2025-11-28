import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Tax } from 'src/taxes/entities/tax.entity';

@Entity({ name: 'tax_groups' })
export class TaxGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  name: string;

  @OneToMany(() => Tax, tax => tax.taxGroup)
  taxes: Tax[];
}