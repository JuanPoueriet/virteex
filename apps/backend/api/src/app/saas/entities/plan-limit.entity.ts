import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Plan } from './plan.entity';

@Entity('saas_plan_limits')
export class PlanLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resource: string; // invoices, users, storage_mb

  @Column({ type: 'int' })
  limit: number; // -1 for unlimited

  @Column({ default: 'monthly' })
  period: 'monthly' | 'lifetime';

  @Column({ name: 'plan_id' })
  planId: string;

  @ManyToOne(() => Plan, plan => plan.limits)
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;
}
