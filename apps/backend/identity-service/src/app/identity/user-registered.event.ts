
import { EntityManager } from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.placeholder';

export class UserRegisteredEvent {
  constructor(
    public readonly user: User,
    public readonly organization: Organization,
    public readonly entityManager: EntityManager
  ) {}
}
