import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index } from 'typeorm';
import type { Customer } from './customer.entity';

@Entity({ name: 'customer_groups' })
export class CustomerGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany('Customer', 'group')
  customers: Customer[];
}