import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'user_security' })
export class UserSecurity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User, (user) => user.security)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @Column({ name: 'token_version', default: 1 })
  tokenVersion: number;

  @Column({ name: 'is_two_factor_enabled', default: false })
  isTwoFactorEnabled: boolean;

  @Column({ name: 'two_factor_secret', nullable: true })
  twoFactorSecret: string;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'lockout_until', type: 'datetime', nullable: true })
  lockoutUntil: Date;
}
