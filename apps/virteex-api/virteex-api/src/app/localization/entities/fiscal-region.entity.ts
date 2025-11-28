
import { Entity, PrimaryGeneratedColumn, Column, Index, OneToMany } from 'typeorm';
import { TaxScheme } from './tax-scheme.entity';

@Entity({ name: 'fiscal_regions' })
export class FiscalRegion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 2 })
  countryCode: string;

  @Column()
  name: string;

  @Column({ length: 3 })
  baseCurrency: string;

  @OneToMany(() => TaxScheme, scheme => scheme.fiscalRegion)
  taxSchemes: TaxScheme[];
}