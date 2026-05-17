import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { VerificationCode, VerificationType } from './verification-code.entity';
import { IMfaOrchestratorService, ISecurityAnalysisService, ITokenService, IUsersService, IPasswordService } from './identity.interfaces';
import { SECURITY_ANALYSIS_SERVICE_TOKEN, TOKEN_SERVICE_TOKEN, USERS_SERVICE_TOKEN, PASSWORD_SERVICE_TOKEN } from './identity.constants';

@Injectable()
export class MfaOrchestratorService implements IMfaOrchestratorService {
  constructor(
    @InjectRepository(VerificationCode)
    private readonly verificationCodeRepository: Repository<VerificationCode>,
    @Inject(SECURITY_ANALYSIS_SERVICE_TOKEN)
    private readonly securityAnalysisService: ISecurityAnalysisService,
    @Inject(TOKEN_SERVICE_TOKEN)
    private readonly tokenService: ITokenService,
    @Inject(USERS_SERVICE_TOKEN)
    private readonly usersService: IUsersService
  ) {}

  async sendLoginOtp(user: User) {
      // Stub
  }

  async complete2faLogin(user: User, code: string, ipAddress?: string, userAgent?: string) {
      const isValid = await this.securityAnalysisService.validateTwoFactorCode(user, code);
      if (!isValid) throw new Error('Invalid code');
      return this.tokenService.generateAuthResponse(user, {}, ipAddress, userAgent);
  }
}
