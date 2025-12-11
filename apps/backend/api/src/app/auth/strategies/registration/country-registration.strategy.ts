
import { RegisterUserDto } from '../../dto/register-user.dto';
import { Organization } from '@virteex/api/organizations';
import { User } from '@virteex/api/data-access-models';
import { EntityManager } from 'typeorm';

export interface CountryRegistrationStrategy {
  validate(dto: RegisterUserDto): Promise<void>;
  provision(organization: Organization, user: User, manager: EntityManager): Promise<void>;
}
