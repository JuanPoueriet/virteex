
import { EntityManager } from 'typeorm';
import { User } from '../../users/entities/user.entity/user.entity';
import { Organization } from '@virteex/api/organizations';

export class UserRegisteredEvent {
  constructor(
    public readonly user: User,
    public readonly organization: Organization,
    public readonly entityManager: EntityManager
  ) {}
}
