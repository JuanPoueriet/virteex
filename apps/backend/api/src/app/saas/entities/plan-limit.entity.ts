import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Plan } from './plan.entity';
import { SaasResource } from '../enums/saas-resource.enum';

@Entity('saas_plan_limits')
export class PlanLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SaasResource
  })
  resource: SaasResource;

  @Column({ type: 'int' })
  limit: number; // -1 for unlimited

  @Column({ name: 'is_unlimited', default: false })
  isUnlimited: boolean;

  @Column({ default: 'monthly' })
  period: 'monthly' | 'lifetime';

  @Column({ name: 'allow_overage', default: false })
  allowOverage: boolean;

  @Column({ name: 'plan_id' })
  planId: string;

  @ManyToOne(() => Plan, plan => plan.limits)
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;
}
