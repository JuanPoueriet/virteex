
import { User } from './user.entity';

export class UserInvitedEvent {
  constructor(
    public readonly user: User,
    public readonly token: string
  ) {}
}
