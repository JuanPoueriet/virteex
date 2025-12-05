
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { VerificationCode } from './entities/verification-code.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { AuditTrailService } from '../audit/audit.service';
import { UserCacheService } from './services/user-cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CryptoUtil } from '../shared/utils/crypto.util';
import { OrganizationsService } from '../organizations/organizations.service';
import { RegistrationService } from './services/registration.service';
import { GeoService } from '../geo/geo.service';
import { PasswordRecoveryService } from './services/password-recovery.service';
import { ImpersonationService } from './services/impersonation.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        }
    }),
  };

  const mockUserCacheService = {
      clearUserSession: jest.fn(),
      invalidate: jest.fn(),
  };

  const mockRegistrationService = {
      register: jest.fn(),
  }

  const mockGeoService = {
      getLocation: jest.fn(),
  }

  const mockUsersService = {
      findUserForAuth: jest.fn(),
      findUserByIdForAuth: jest.fn(),
      findOneByEmail: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService }, // Added UsersService
        { provide: getRepositoryToken(User), useValue: mockRepository }, // Can remove this if AuthService doesn't use it anymore, but other services might need it if mocked poorly
        { provide: getRepositoryToken(Organization), useValue: mockRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRepository },
        { provide: getRepositoryToken(VerificationCode), useValue: mockRepository },
        { provide: 'SmsProvider', useValue: { send: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn(), getOrThrow: jest.fn() } },
        { provide: DataSource, useValue: mockDataSource },
        { provide: MailService, useValue: { sendDuplicateRegistrationEmail: jest.fn() } },
        { provide: AuditTrailService, useValue: { record: jest.fn() } },
        { provide: UserCacheService, useValue: mockUserCacheService },
        { provide: EventEmitter2, useValue: { emitAsync: jest.fn() } },
        { provide: CryptoUtil, useValue: { decrypt: jest.fn(), encrypt: jest.fn() } },
        { provide: OrganizationsService, useValue: { create: jest.fn() } },
        { provide: RegistrationService, useValue: mockRegistrationService },
        { provide: GeoService, useValue: mockGeoService },
        {
          provide: PasswordRecoveryService,
          useValue: {
            setPasswordFromInvitation: jest.fn(),
          },
        },
        {
          provide: ImpersonationService,
          useValue: {
            validateImpersonationRequest: jest.fn(),
            validateStopImpersonation: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
