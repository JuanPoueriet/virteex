
import { RegisterUserDto } from './register-user.dto';
import { Organization } from './organization.placeholder';
import { User } from './user.entity';
import { EntityManager } from 'typeorm';

export interface CountryRegistrationStrategy {
  validate(dto: RegisterUserDto): Promise<void>;
  provision(organization: Organization, user: User, manager: EntityManager): Promise<void>;
}
