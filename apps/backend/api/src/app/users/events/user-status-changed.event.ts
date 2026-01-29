import { User, UserStatus } from '../entities/user.entity/user.entity';

export class UserStatusChangedEvent {
  constructor(
    public readonly user: User,
    public readonly status: UserStatus
  ) {}
}
