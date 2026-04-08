import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('simple-array', { nullable: true })
  permissions: string[];

  @Column({ name: 'organization_id', nullable: true })
  organizationId: string;

  @Column({ name: 'is_system_role', default: false })
  isSystemRole: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
