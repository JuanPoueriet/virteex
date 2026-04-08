import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoginUserDto } from './login-user.dto';
import { User, UserStatus } from './user.entity';
import { JwtPayload } from './jwt-payload.interface';
import { SafeUser, AuthenticatedUser } from './authenticated-user.interface';
import { AuthError } from './auth-error.enum';
import { AuthException } from './auth.exception';
import { LoginResultDto } from './login-response.dto';
import { IAuthService, IUsersService, ISessionService, ISecurityAnalysisService, ITokenService, IMfaOrchestratorService, IPasswordService } from './identity.interfaces';
import { USERS_SERVICE_TOKEN, SESSION_SERVICE_TOKEN, SECURITY_ANALYSIS_SERVICE_TOKEN, TOKEN_SERVICE_TOKEN, MFA_ORCHESTRATOR_SERVICE_TOKEN, PASSWORD_SERVICE_TOKEN } from './identity.constants';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(USERS_SERVICE_TOKEN)
    private readonly usersService: IUsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(SESSION_SERVICE_TOKEN)
    private readonly sessionService: ISessionService,
    @Inject(SECURITY_ANALYSIS_SERVICE_TOKEN)
    private readonly securityAnalysisService: ISecurityAnalysisService,
    @Inject(TOKEN_SERVICE_TOKEN)
    private readonly tokenService: ITokenService,
    @Inject(MFA_ORCHESTRATOR_SERVICE_TOKEN)
    private readonly mfaOrchestratorService: IMfaOrchestratorService,
    @Inject(PASSWORD_SERVICE_TOKEN)
    private readonly passwordService: IPasswordService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async login(loginUserDto: LoginUserDto & { twoFactorCode?: string }, ipAddress?: string, userAgent?: string): Promise<LoginResultDto> {
    const { email, password, twoFactorCode, rememberMe } = loginUserDto;
    const user = await this.usersService.findOneByEmail(email);

    if (!user || !(await this.passwordService.verify(user.security?.passwordHash || '', password))) {
        throw new AuthException(AuthError.INVALID_CREDENTIALS);
    }

    if (user.status !== UserStatus.ACTIVE) {
        throw new AuthException(AuthError.USER_INACTIVE);
    }

    if (user.security?.isTwoFactorEnabled) {
      if (!twoFactorCode) {
         return {
            require2fa: true,
            tempToken: 'temp',
            message: '2FA required'
         };
      }
      return this.mfaOrchestratorService.complete2faLogin(user, twoFactorCode, ipAddress, userAgent);
    }

    return this.tokenService.generateAuthResponse(user, {}, ipAddress, userAgent, rememberMe);
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    return this.tokenService.validateTokenAndGetUser(payload);
  }

  async refreshAccessToken(token: string, ipAddress?: string, userAgent?: string) {
    return this.sessionService.refreshAccessToken(token, ipAddress, userAgent);
  }

  async status(userFromJwt: AuthenticatedUser) {
    return this.tokenService.getFreshUserStatus(userFromJwt);
  }

  async logout(userId: string) {
    await this.sessionService.terminateAllSessions(userId);
    return { message: 'Logged out' };
  }

  async changePassword(userId: string, currentPass: string, newPass: string): Promise<void> {
      const user = await this.usersService.findOne(userId);
      // Logic for change password...
  }
}
