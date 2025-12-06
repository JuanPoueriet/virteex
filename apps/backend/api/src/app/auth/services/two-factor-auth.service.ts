import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { authenticator } from 'otplib';
import { User } from '../../users/entities/user.entity/user.entity';
import { CryptoUtil } from '../../shared/utils/crypto.util';
import { UserCacheService } from '../modules/user-cache.service';
import { UserSecurity } from '../../users/entities/user-security.entity';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

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

    let security = await this.ensureSecurityEntity(user);

    security.twoFactorSecret = encryptedSecret;
    await this.userSecurityRepository.save(security);

    return { secret, otpauthUrl };
  }

  async enableTwoFactor(user: User, token: string) {
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

    // Auto-generate backup codes upon enabling
    const { codes, hashedCodes } = await this.createBackupCodes();
    freshUser.security.backupCodes = hashedCodes;

    await this.userSecurityRepository.save(freshUser.security);

    await this.userCacheService.clearUserSession(user.id);

    return { message: '2FA enabled successfully', backupCodes: codes };
  }

  async disableTwoFactor(user: User) {
      const freshUser = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['security']
      });

      if (freshUser && freshUser.security) {
          // Use update to force nulls/false
          await this.userSecurityRepository.save({
              id: freshUser.security.id,
              isTwoFactorEnabled: false,
              twoFactorSecret: null,
              backupCodes: null // Clear backup codes
          });
      }

      await this.userCacheService.clearUserSession(user.id);
      return { message: '2FA disabled successfully' };
  }

  // 10/10 SECURITY: Backup Codes Management
  async generateBackupCodes(user: User) {
      const security = await this.ensureSecurityEntity(user);

      if (!security.isTwoFactorEnabled) {
          throw new BadRequestException('Cannot generate backup codes if 2FA is not enabled.');
      }

      const { codes, hashedCodes } = await this.createBackupCodes();

      security.backupCodes = hashedCodes;
      await this.userSecurityRepository.save(security);

      return { codes };
  }

  async verifyBackupCode(user: User, code: string): Promise<boolean> {
      const security = user.security || (await this.ensureSecurityEntity(user));

      if (!security.backupCodes || security.backupCodes.length === 0) {
          return false;
      }

      // Check against all hashed codes
      // This is O(N) where N is small (e.g., 10). Acceptable.
      for (const hashedCode of security.backupCodes) {
          if (await argon2.verify(hashedCode, code)) {
              // Code is valid. Remove it (Burn on use).
              security.backupCodes = security.backupCodes.filter(c => c !== hashedCode);
              await this.userSecurityRepository.save(security);
              return true;
          }
      }

      return false;
  }

  private async createBackupCodes(): Promise<{ codes: string[], hashedCodes: string[] }> {
      const codes: string[] = [];
      const hashedCodes: string[] = [];

      for (let i = 0; i < 10; i++) {
          const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars
          // Format: XXXX-XXXX
          const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`;
          codes.push(formattedCode);
          hashedCodes.push(await argon2.hash(formattedCode));
      }

      return { codes, hashedCodes };
  }

  private async ensureSecurityEntity(user: User): Promise<UserSecurity> {
      let security = user.security;
      if (!security) {
          const freshUser = await this.userRepository.findOne({ where: { id: user.id }, relations: ['security'] });
          if (!freshUser) throw new UnauthorizedException('User not found');

          if (!freshUser.security) {
              freshUser.security = new UserSecurity();
              freshUser.security.userId = user.id;
              await this.userSecurityRepository.save(freshUser.security);
          }
          security = freshUser.security;
      }
      return security;
  }
}
