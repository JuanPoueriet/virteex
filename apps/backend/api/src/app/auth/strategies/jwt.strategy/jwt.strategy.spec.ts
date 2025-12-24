
import { JwtStrategy } from './jwt.strategy';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UsersService } from '../../../users/users.service';
import { UnauthorizedException } from '@nestjs/common';
import { AuthError } from '../../enums/auth-error.enum';
import { User, UserStatus } from '../../../users/entities/user.entity/user.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { UserSecurity } from '../../../users/entities/user-security.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let cacheManager: any;
  let usersService: any;
  let configService: any;

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    usersService = {
      findUserByIdForAuth: jest.fn(),
    };

    configService = {
      getOrThrow: jest.fn().mockReturnValue('secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should invalidate cache if organization is missing', async () => {
    const payload = { id: 'user-id', tokenVersion: 1, organizationId: 'org-id' } as any;

    // Mock user in cache without organization
    const cachedUser = new User();
    cachedUser.id = 'user-id';
    cachedUser.security = { tokenVersion: 1 } as UserSecurity;
    // user.organization is undefined

    cacheManager.get.mockResolvedValue(cachedUser);

    // Mock DB return with organization
    const dbUser = new User();
    dbUser.id = 'user-id';
    dbUser.organization = new Organization();
    dbUser.organization.id = 'org-id';
    dbUser.security = { tokenVersion: 1 } as UserSecurity;
    dbUser.roles = [];
    dbUser.status = UserStatus.ACTIVE;

    usersService.findUserByIdForAuth.mockResolvedValue(dbUser);

    const result = await strategy.validate(payload);

    expect(result).toBeDefined();
    expect(result.id).toBe('user-id');
    expect(usersService.findUserByIdForAuth).toHaveBeenCalledWith('user-id');
    expect(cacheManager.set).toHaveBeenCalled(); // Should update cache
  });

  it('should use cache if organization is present', async () => {
    const payload = { id: 'user-id', tokenVersion: 1, organizationId: 'org-id' } as any;

    // Mock user in cache WITH organization
    const cachedUser = new User();
    cachedUser.id = 'user-id';
    cachedUser.organization = new Organization();
    cachedUser.organization.id = 'org-id';
    cachedUser.security = { tokenVersion: 1 } as UserSecurity;
    cachedUser.roles = [];
    cachedUser.status = UserStatus.ACTIVE;

    cacheManager.get.mockResolvedValue(cachedUser);

    const result = await strategy.validate(payload);

    expect(result).toBeDefined();
    expect(usersService.findUserByIdForAuth).not.toHaveBeenCalled();
  });
});
