import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { authenticator } from 'otplib';
import { User } from '../../users/entities/user.entity/user.entity';
import { CryptoUtil } from '../../shared/utils/crypto.util';
import { UserCacheService } from './user-cache.service';

@Injectable()
export class TwoFactorAuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly cryptoUtil: CryptoUtil,
    private readonly userCacheService: UserCacheService
  ) {}

  async generateTwoFactorSecret(user: User) {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'Virteex ERP', secret);

    // Encrypt secret before saving
    const encryptedSecret = this.cryptoUtil.encrypt(secret);
    // We save the secret but DO NOT enable it yet. User must verify first.
    await this.userRepository.update(user.id, { twoFactorSecret: encryptedSecret });

    return { secret, otpauthUrl };
  }

  async enableTwoFactor(user: User, token: string) {
    // Need to fetch secret as it might not be in the user object passed in (usually stripped)
    const freshUser = await this.userRepository.findOne({ where: { id: user.id }, select: ['twoFactorSecret', 'id'] });
    if (!freshUser?.twoFactorSecret) {
         throw new BadRequestException('2FA configuration not initiated. Please generate secret first.');
    }

    // Decrypt secret
    const decryptedSecret = this.cryptoUtil.decrypt(freshUser.twoFactorSecret);

    const isValid = authenticator.verify({ token, secret: decryptedSecret });
    if (!isValid) {
        throw new UnauthorizedException('Invalid 2FA token');
    }

    await this.userRepository.update(user.id, { isTwoFactorEnabled: true });

    // Invalidate session to force re-login or update user state
    await this.userCacheService.clearUserSession(user.id);

    return { message: '2FA enabled successfully' };
  }

  async disableTwoFactor(user: User) {
      await this.userRepository.update(user.id, { isTwoFactorEnabled: false, twoFactorSecret: null });
      await this.userCacheService.clearUserSession(user.id);
      return { message: '2FA disabled successfully' };
  }
}
