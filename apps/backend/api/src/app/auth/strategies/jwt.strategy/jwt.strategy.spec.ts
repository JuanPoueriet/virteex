
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../../users/users.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: any;
  let cacheManager: any;

  beforeEach(async () => {
    usersService = {
      findUserByIdForAuth: jest.fn(),
    };
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UsersService, useValue: usersService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('secret') },
        },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate and return user with organizationId', async () => {
    const payload = { id: 'user-1', tokenVersion: 1, organizationId: 'org-1' };
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      roles: [],
      organization: { id: 'org-1' },
      security: { tokenVersion: 1 },
    };

    cacheManager.get.mockResolvedValue(user);

    const result = await strategy.validate(payload as any);

    expect(result).toBeDefined();
    expect(result.organizationId).toBe('org-1');
    expect(result.id).toBe('user-1');
  });

  it('should throw UnauthorizedException if user not found', async () => {
    const payload = { id: 'user-1', tokenVersion: 1, organizationId: 'org-1' };
    cacheManager.get.mockResolvedValue(null);
    usersService.findUserByIdForAuth.mockResolvedValue(null);

    await expect(strategy.validate(payload as any)).rejects.toThrow(UnauthorizedException);
  });
});
