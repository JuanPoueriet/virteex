import { User } from '../entities/user.entity/user.entity';

export class UserPasswordResetEvent {
  constructor(
    public readonly user: User,
    public readonly token: string
  ) {}
}
