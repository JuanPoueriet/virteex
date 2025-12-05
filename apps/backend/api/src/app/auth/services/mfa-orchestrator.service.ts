import { Injectable, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomInt } from 'crypto';

import { User } from '../../users/entities/user.entity/user.entity';
import { VerificationCode, VerificationType } from '../entities/verification-code.entity';
import { AbstractSmsProvider } from './abstract-sms.provider';
import { SecurityAnalysisService } from './security-analysis.service';
import { AuditTrailService } from '../../audit/audit.service';
import { ActionType } from '../../audit/entities/audit-log.entity';
import { TokenService } from './token.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class MfaOrchestratorService {
  constructor(
    @InjectRepository(VerificationCode)
    private readonly verificationCodeRepository: Repository<VerificationCode>,
    private readonly smsProvider: AbstractSmsProvider,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly securityAnalysisService: SecurityAnalysisService,
    private readonly auditService: AuditTrailService,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService
  ) {}

  async sendPhoneOtp(userId: string, phoneNumber: string) {
    const code = randomInt(100000, 999999).toString();
    const hash = await argon2.hash(code);

    await this.verificationCodeRepository.delete({ userId, type: VerificationType.PHONE_VERIFY });

    const verificationCode = this.verificationCodeRepository.create({
      userId,
      code: hash,
      payload: phoneNumber, // Bind code to specific phone number
      type: VerificationType.PHONE_VERIFY,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await this.verificationCodeRepository.save(verificationCode);

    await this.smsProvider.send(phoneNumber, `Your verification code is: ${code}`);
  }

  async verifyPhoneOtp(userId: string, code: string, phoneNumber: string) {
    const record = await this.verificationCodeRepository.findOne({
      where: { userId, type: VerificationType.PHONE_VERIFY },
    });

    if (!record) {
      throw new BadRequestException('No verification code found or expired.');
    }

    if (new Date() > record.expiresAt) {
      await this.verificationCodeRepository.delete(record.id);
      throw new BadRequestException('Verification code expired.');
    }

    // Security: Check if phone number matches the one the code was sent to
    if (record.payload && record.payload !== phoneNumber) {
        throw new BadRequestException('Invalid phone number for this verification code.');
    }

    const isValid = await argon2.verify(record.code, code);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code.');
    }

    await this.usersService.update(userId, {
      phone: phoneNumber,
      isPhoneVerified: true
    });

    await this.verificationCodeRepository.delete(record.id);

    return { message: 'Phone number verified successfully.' };
  }

  async sendLoginOtp(user: User) {
      const code = randomInt(100000, 999999).toString();
      const hash = await argon2.hash(code);

      await this.verificationCodeRepository.delete({ userId: user.id, type: VerificationType.LOGIN_2FA });

      await this.verificationCodeRepository.save({
          userId: user.id,
          code: hash,
          type: VerificationType.LOGIN_2FA,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      });

      if (user.phone) {
          await this.smsProvider.send(user.phone, `Your Login Code: ${code}`);
      }
  }

  async complete2faLogin(user: User, code: string, ipAddress?: string, userAgent?: string) {
      const isValid2FA = await this.securityAnalysisService.validateTwoFactorCode(user, code);

      if (!isValid2FA) {
         await this.auditService.record(
            user.id,
            'User',
            user.id,
            ActionType.LOGIN_FAILED,
            { email: user.email, reason: 'Invalid 2FA Code' },
            undefined
         );
         throw new UnauthorizedException('Código 2FA inválido');
      }

    // Reset attempts on successful 2FA
    // Ideally we should reset login attempts here, but that method is private in AuthService or should be moved.
    // For now we can expose a method in UsersService or handle it here if we inject UsersService.
    if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
       await this.usersService.update(user.id, {
         failedLoginAttempts: 0,
         lockoutUntil: null
       });
    }

    await this.auditService.record(
        user.id,
        'User',
        user.id,
        ActionType.LOGIN,
        { email: user.email, ipAddress, userAgent, method: '2FA' },
        undefined,
    );

    return await this.tokenService.generateAuthResponse(user, {}, ipAddress, userAgent);
  }
}
