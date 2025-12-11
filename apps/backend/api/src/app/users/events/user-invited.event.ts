
import { User } from '@virteex/api/data-access-models';

export class UserInvitedEvent {
  constructor(
    public readonly user: User,
    public readonly token: string
  ) {}
}
