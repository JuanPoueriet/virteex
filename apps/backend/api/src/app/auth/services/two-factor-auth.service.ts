import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { authenticator } from 'otplib';
import { User } from '../../users/entities/user.entity/user.entity';
import { CryptoUtil } from '../../shared/utils/crypto.util';
import { UserCacheService } from '../modules/user-cache.service';
import { UserSecurity } from '../../users/entities/user-security.entity';

@Injectable()
export class TwoFactorAuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserSecurity) private readonly userSecurityRepository: Repository<UserSecurity>,
    private readonly cryptoUtil: CryptoUtil,
    private readonly userCacheService: UserCacheService
  ) {}

  async generateTwoFactorSecret(user: User) {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'Virteex ERP', secret);

    // Encrypt secret before saving
    const encryptedSecret = this.cryptoUtil.encrypt(secret);

    // We save the secret but DO NOT enable it yet. User must verify first.
    // Ensure security entity exists
    let security = user.security;
    if (!security) {
         // Should try to load it or create it
         const freshUser = await this.userRepository.findOne({ where: { id: user.id }, relations: ['security'] });
         if (!freshUser) throw new UnauthorizedException('User not found');
         if (!freshUser.security) {
             freshUser.security = new UserSecurity();
             freshUser.security.userId = user.id; // Or let typeorm handle it
         }
         security = freshUser.security;
         user.security = security;
    }

    security.twoFactorSecret = encryptedSecret;
    await this.userSecurityRepository.save(security); // Save security directly

    return { secret, otpauthUrl };
  }

  async enableTwoFactor(user: User, token: string) {
    // Need to fetch secret as it might not be in the user object passed in (usually stripped)
    const freshUser = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['security']
    });

    if (!freshUser?.security?.twoFactorSecret) {
         throw new BadRequestException('2FA configuration not initiated. Please generate secret first.');
    }

    // Decrypt secret
    const decryptedSecret = this.cryptoUtil.decrypt(freshUser.security.twoFactorSecret);

    const isValid = authenticator.verify({ token, secret: decryptedSecret });
    if (!isValid) {
        throw new UnauthorizedException('Invalid 2FA token');
    }

    freshUser.security.isTwoFactorEnabled = true;
    await this.userSecurityRepository.save(freshUser.security);

    // Invalidate session to force re-login or update user state
    await this.userCacheService.clearUserSession(user.id);

    return { message: '2FA enabled successfully' };
  }

  async disableTwoFactor(user: User) {
      const freshUser = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['security']
      });

      if (freshUser && freshUser.security) {
          freshUser.security.isTwoFactorEnabled = false;
          freshUser.security.twoFactorSecret = undefined; // Set to undefined to clear it, TypeORM should handle null
          // Actually better to use null if configured nullable
          // In entity: twoFactorSecret?: string
          // Let's force it to null via partial update or save
          // TypeORM save ignores undefined usually, unless configured.
          await this.userSecurityRepository.save({
              id: freshUser.security.id,
              isTwoFactorEnabled: false,
              twoFactorSecret: null
          });
      }

      await this.userCacheService.clearUserSession(user.id);
      return { message: '2FA disabled successfully' };
  }
}
