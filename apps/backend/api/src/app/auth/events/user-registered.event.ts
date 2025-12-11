
import { EntityManager } from 'typeorm';
import { User } from '@virteex/api/data-access-models';
import { Organization } from '@virteex/api/data-access-models';

export class UserRegisteredEvent {
  constructor(
    public readonly user: User,
    public readonly organization: Organization,
    public readonly entityManager: EntityManager
  ) {}
}
