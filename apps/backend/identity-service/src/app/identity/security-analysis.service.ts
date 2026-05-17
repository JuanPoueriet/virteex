import { Injectable, Logger, UnauthorizedException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { authenticator } from 'otplib';
import * as argon2 from 'argon2';
import * as Bowser from 'bowser';
import { User } from './user.entity';
import { VerificationCode, VerificationType } from './verification-code.entity';
import { AuthConfig } from './auth.config';
import { ISecurityAnalysisService, IGeoService, IUserCacheService } from './identity.interfaces';
import { GEO_SERVICE_TOKEN, CRYPTO_UTIL_TOKEN, USER_CACHE_SERVICE_TOKEN } from './identity.constants';

@Injectable()
export class SecurityAnalysisService implements ISecurityAnalysisService {
  private readonly logger = new Logger(SecurityAnalysisService.name);

  constructor(
    @Inject(GEO_SERVICE_TOKEN)
    private readonly geoService: IGeoService,
    @InjectRepository(VerificationCode)
    private readonly verificationCodeRepository: Repository<VerificationCode>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(CRYPTO_UTIL_TOKEN)
    private readonly cryptoUtil: any
  ) {}

  async checkImpossibleTravel(userId: string, currentIp?: string): Promise<void> {
    // Basic implementation or stub to avoid dependency on AuditService for now
    return;
  }

  async validateTwoFactorCode(user: User, code: string): Promise<boolean> {
    let isValid2FA = false;

    if (user.security && user.security.twoFactorSecret) {
      const decryptedSecret = this.cryptoUtil.decrypt(user.security.twoFactorSecret);
      try {
        isValid2FA = authenticator.verify({
          token: code,
          secret: decryptedSecret,
        });
      } catch (e) {}
    }

    if (!isValid2FA) {
      const record = await this.verificationCodeRepository.findOne({
        where: { userId: user.id, type: VerificationType.LOGIN_2FA },
      });

      if (record && new Date() <= record.expiresAt) {
        isValid2FA = await argon2.verify(record.code, code);
        if (isValid2FA) {
          await this.verificationCodeRepository.delete(record.id);
        }
      }
    }

    return isValid2FA;
  }

  parseUserAgent(userAgent: string): { browser: string; os: string; deviceType: string } {
    if (!userAgent) return { browser: 'Unknown', os: 'Unknown', deviceType: 'Unknown' };
    try {
      const parsed = Bowser.parse(userAgent);
      return {
        browser: parsed.browser.name || 'Unknown',
        os: parsed.os.name || 'Unknown',
        deviceType: (parsed.platform as any)?.type || 'Unknown'
      };
    } catch (error) {
      return { browser: 'Unknown', os: 'Unknown', deviceType: 'Unknown' };
    }
  }

  async handleFailedLoginAttempt(user: User) {
    if (!user.security) return;
    const MAX_FAILED_ATTEMPTS = AuthConfig.MAX_FAILED_ATTEMPTS;
    const lockoutMs = AuthConfig.LOCKOUT_DURATION;

    user.security.failedLoginAttempts = (user.security.failedLoginAttempts || 0) + 1;
    if (user.security.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.security.lockoutUntil = new Date(Date.now() + lockoutMs);
    }
    await this.userRepository.save(user);
  }

  async resetLoginAttempts(user: User) {
    if (user.security && (user.security.failedLoginAttempts > 0 || user.security.lockoutUntil)) {
      user.security.failedLoginAttempts = 0;
      user.security.lockoutUntil = null;
      await this.userRepository.save(user);
    }
  }
}
