import { Injectable, Logger, UnauthorizedException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { authenticator } from 'otplib';
import * as argon2 from 'argon2';
import { GeoService } from '../../geo/geo.service';
import { AuditTrailService } from '../../audit/audit.service';
import { AuthConfig } from '../auth.config';
import { User } from '../../users/entities/user.entity/user.entity';
import { VerificationCode, VerificationType } from '../entities/verification-code.entity';
import { CryptoUtil } from '../../shared/utils/crypto.util';

@Injectable()
export class SecurityAnalysisService {
  private readonly logger = new Logger(SecurityAnalysisService.name);

  constructor(
    private readonly geoService: GeoService,
    private readonly auditService: AuditTrailService,
    @InjectRepository(VerificationCode)
    private readonly verificationCodeRepository: Repository<VerificationCode>,
    private readonly cryptoUtil: CryptoUtil
  ) {}

  /**
   * Checks for "Impossible Travel" anomalies based on the user's last login IP.
   * Throws UnauthorizedException if travel speed exceeds reasonable limits.
   */
  async checkImpossibleTravel(userId: string, currentIp?: string): Promise<void> {
    if (!currentIp || !userId) return;

    const lastLogin = await this.auditService.getLastLogin(userId);
    if (!lastLogin || !lastLogin.ipAddress) return;

    if (lastLogin.ipAddress === currentIp) return;

    const currentLocation = this.geoService.getLocation(currentIp);
    const lastLocation = this.geoService.getLocation(lastLogin.ipAddress);

    if (currentLocation.ll && lastLocation.ll) {
      const [currentLat, currentLon] = currentLocation.ll;
      const [lastLat, lastLon] = lastLocation.ll;

      const distanceKm = this.geoService.calculateDistance(lastLat, lastLon, currentLat, currentLon);
      const timeDiffHours = (Date.now() - lastLogin.timestamp.getTime()) / (1000 * 60 * 60);

      // Avoid division by zero
      const safeTimeDiff = timeDiffHours < 0.01 ? 0.01 : timeDiffHours;

      const speed = distanceKm / safeTimeDiff;

      const maxSpeed = AuthConfig.IMPOSSIBLE_TRAVEL_MAX_SPEED;
      const minDistance = AuthConfig.IMPOSSIBLE_TRAVEL_MIN_DISTANCE;

      if (distanceKm > minDistance && speed > maxSpeed) {
        this.logger.warn(
          `[SECURITY] Impossible Travel Detected for User ${userId}. Distance: ${distanceKm.toFixed(
            2
          )}km, Time: ${timeDiffHours.toFixed(2)}h, Speed: ${speed.toFixed(2)}km/h. Previous IP: ${
            lastLogin.ipAddress
          }, Current IP: ${currentIp}`
        );
        throw new UnauthorizedException(
          'Viaje imposible detectado. Por seguridad, su cuenta ha sido bloqueada temporalmente. Contacte a soporte.'
        );
      }
    }
  }

  /**
   * Validates a 2FA code (TOTP or SMS).
   */
  async validateTwoFactorCode(user: User, code: string): Promise<boolean> {
    let isValid2FA = false;

    // 1. Try TOTP (Authenticator App) if secret exists
    if (user.twoFactorSecret) {
      const decryptedSecret = this.cryptoUtil.decrypt(user.twoFactorSecret);
      try {
        isValid2FA = authenticator.verify({
          token: code,
          secret: decryptedSecret,
        });
      } catch (e) {
        this.logger.error(`TOTP Verification Error for user ${user.id}: ${(e as Error).message}`);
      }
    }

    // 2. If not valid via TOTP, try SMS OTP (if verification code exists)
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

  /**
   * Lightweight User Agent Parser.
   * Replaces ua-parser-js to avoid AGPLv3 licensing issues.
   * Only extracts OS and Browser name for change detection.
   */
  parseUserAgent(userAgent: string): { browser: string; os: string } {
    if (!userAgent) return { browser: 'Unknown', os: 'Unknown' };

    let browser = 'Unknown';
    let os = 'Unknown';

    // Basic Browser Detection
    if (/firefox|iceweasel|fxios/i.test(userAgent)) browser = 'Firefox';
    else if (/chrome|crios/i.test(userAgent) && !/edge|opr/i.test(userAgent)) browser = 'Chrome';
    else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) browser = 'Safari';
    else if (/opr\//i.test(userAgent)) browser = 'Opera';
    else if (/edg/i.test(userAgent)) browser = 'Edge';
    else if (/msie|trident/i.test(userAgent)) browser = 'IE';

    // Basic OS Detection
    if (/windows/i.test(userAgent)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
    else if (/linux/i.test(userAgent)) os = 'Linux';
    else if (/android/i.test(userAgent)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';

    return { browser, os };
  }
}
