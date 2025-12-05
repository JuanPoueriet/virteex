
import { ConflictException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { RegisterUserDto } from '../dto/register-user.dto';
import { User, UserStatus } from '../../users/entities/user.entity/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Role } from '../../roles/entities/role.entity';
import { MailService } from '../../mail/mail.service';
import { OrganizationsService } from '../../organizations/organizations.service';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { RoleEnum } from '../../roles/enums/role.enum';
import { DEFAULT_ROLES } from '../../config/roles.config';
import { AuthConfig } from '../auth.config';
import { UserSecurity } from '../../users/entities/user-security.entity';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly organizationsService: OrganizationsService,
    private readonly mailService: MailService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>
  ) {}

  async register(registerUserDto: RegisterUserDto) {
    const {
      email,
      taxId, // Renamed from rnc
      password,
      organizationName,
      firstName,
      lastName,
      fiscalRegionId,
      industry, // New field
      companySize, // New field
      address // New field
    } = registerUserDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email },
      });
      if (existingUser) {
        try {
          await this.mailService.sendDuplicateRegistrationEmail(email, existingUser.firstName);
        } catch (e) {
          this.logger.error('Failed to send duplicate registration email', e);
        }
        await this.simulateDelay();
        throw new ConflictException('No se pudo completar el registro. Verifique que los datos sean correctos o contacte soporte.');
      }

      if (taxId) {
        const existingOrg = await queryRunner.manager.findOne(Organization, {
          where: { taxId: taxId },
        });
        if (existingOrg) {
          throw new ConflictException('No se pudo completar el registro. Verifique que los datos sean correctos o contacte soporte.');
        }
      }

      // Create Organization with additional fields if entity supports them, or just basic
      const organization = await this.organizationsService.create({
        legalName: organizationName,
        taxId: taxId || null,
        fiscalRegionId: fiscalRegionId,
        industry: industry, // Pass industry for provisioning
        companySize: companySize,
        address: address
      }, queryRunner.manager);

      const defaultRoles = this.getDefaultRolesForOrganization(organization.id);
      const roleEntities = defaultRoles.map((role) =>
        queryRunner.manager.create(Role, { ...role }),
      );
      await queryRunner.manager.save(roleEntities);

      const adminRole = roleEntities.find((r) => r.name === RoleEnum.ADMINISTRATOR);
      if (!adminRole) {
        throw new InternalServerErrorException(
          'No se pudo encontrar el rol de administrador predeterminado.',
        );
      }

      const passwordHash = await argon2.hash(password);

      const userSecurity = queryRunner.manager.create(UserSecurity, {
          passwordHash,
          failedLoginAttempts: 0,
          lockoutUntil: null,
      });

      const user = queryRunner.manager.create(User, {
        firstName,
        lastName,
        email,
        organization,
        organizationId: organization.id,
        roles: [adminRole],
        status: UserStatus.ACTIVE,
        security: userSecurity
      });
      await queryRunner.manager.save(user);

      // Trigger event which will handle Localization Application (Provisioning)
      await this.eventEmitter.emitAsync(
        'user.registered',
        new UserRegisteredEvent(user, organization, queryRunner.manager)
      );

      await queryRunner.commitTransaction();

      user.organization = organization;
      user.roles = [adminRole];

      return user;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Error en el registro:', error);
      throw new InternalServerErrorException(
        'Error inesperado, por favor revise los logs del servidor.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  private getDefaultRolesForOrganization(organizationId: string) {
    return DEFAULT_ROLES.map(role => ({
        ...role,
        organizationId
    }));
  }

  private async simulateDelay() {
    return new Promise((resolve) => setTimeout(resolve, AuthConfig.SIMULATED_DELAY_MS));
  }
}
