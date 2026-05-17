import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum VerificationType {
  PHONE_VERIFY = 'PHONE_VERIFY',
  LOGIN_2FA = 'LOGIN_2FA',
  EMAIL_VERIFY = 'EMAIL_VERIFY',
}

@Entity({ name: 'verification_codes' })
export class VerificationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  code: string;

  @Column({ nullable: true })
  payload?: string;

  @Column({ type: 'varchar' })
  type: VerificationType;

  @Column({ type: 'datetime' })
  expiresAt: Date;
}
