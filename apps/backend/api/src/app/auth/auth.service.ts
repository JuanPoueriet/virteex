
import {
  Injectable,
  UnauthorizedException,
  Logger
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { LoginUserDto } from './dto/login-user.dto';
import { User, UserStatus } from '../users/entities/user.entity/user.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthConfig } from './auth.config';
import { UsersService } from '../users/users.service';
import { SessionService } from './services/session.service';
import { SecurityAnalysisService } from './services/security-analysis.service';
import { TokenService } from './services/token.service';
import { MfaOrchestratorService } from './services/mfa-orchestrator.service';
import { PasswordService } from './services/password.service';
import { AuthEvents, AuthLoginFailedEvent, AuthLoginSuccessEvent } from './events/auth.events';
import { SafeUser, AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { AuthError } from './enums/auth-error.enum';
import { AuthException } from './exceptions/auth.exception';

export type LoginResult =
  | { user: AuthenticatedUser; accessToken: string; refreshToken: string; refreshTokenId: string }
  | { require2fa: true; tempToken: string; message: string };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
    private readonly securityAnalysisService: SecurityAnalysisService,
    private readonly tokenService: TokenService,
    private readonly mfaOrchestratorService: MfaOrchestratorService,
    private readonly passwordService: PasswordService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async login(loginUserDto: LoginUserDto & { twoFactorCode?: string }, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    const { email, password, twoFactorCode } = loginUserDto;

    const user = await this.usersService.findUserForAuth(email);

    if (user && user.security && user.security.lockoutUntil && new Date() < user.security.lockoutUntil) {
      throw new AuthException(AuthError.USER_BLOCKED, 401, {
        lockoutUntil: user.security.lockoutUntil
      });
    }

    let isPasswordValid = false;
    if (user && user.security && user.security.passwordHash) {
        isPasswordValid = await this.passwordService.verify(user.security.passwordHash, password);
    } else {
        await this.passwordService.verifyDummy(password);
        isPasswordValid = false;
    }

    if (!user || !isPasswordValid) {
          if (user) {
              await this.securityAnalysisService.handleFailedLoginAttempt(user);
              this.eventEmitter.emit(
                  AuthEvents.LOGIN_FAILED,
                  new AuthLoginFailedEvent(user.id, user.email, 'Invalid Credentials', ipAddress, userAgent)
              );
          }
          await this.simulateDelay();
          throw new AuthException(AuthError.INVALID_CREDENTIALS);
    }

    if (user.status !== UserStatus.ACTIVE) {
       this.eventEmitter.emit(
           AuthEvents.LOGIN_FAILED,
           new AuthLoginFailedEvent(user.id, user.email, 'User Inactive/Blocked', ipAddress, userAgent)
       );
      // Obfuscated error message to prevent enumeration
      throw new AuthException(AuthError.INVALID_CREDENTIALS);
    }

    // 2FA Check
    if (user.security && user.security.isTwoFactorEnabled) {
      if (!twoFactorCode) {
         const tempToken = this.jwtService.sign(
            { id: user.id, type: '2fa_pending', tokenVersion: user.security.tokenVersion },
            { expiresIn: '5m', secret: this.configService.getOrThrow('JWT_SECRET') }
         );

         if (user.isPhoneVerified && user.phone) {
             await this.mfaOrchestratorService.sendLoginOtp(user);
         }

         return {
            require2fa: true,
            tempToken,
            message: '2FA verification required'
         };
      }

      const result = await this.mfaOrchestratorService.complete2faLogin(user, twoFactorCode, ipAddress, userAgent);
      await this.securityAnalysisService.checkImpossibleTravel(user.id, ipAddress);

    // Explicitly construct the result to satisfy type system without casting
    return {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        refreshTokenId: result.refreshTokenId
    };
    }

    await this.securityAnalysisService.checkImpossibleTravel(user.id, ipAddress);

    await this.securityAnalysisService.resetLoginAttempts(user);

    this.eventEmitter.emit(
        AuthEvents.LOGIN_SUCCESS,
        new AuthLoginSuccessEvent(user.id, user.email, ipAddress, userAgent)
    );

    const authResponse = await this.tokenService.generateAuthResponse(user, {}, ipAddress, userAgent);
  return {
      user: authResponse.user,
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
      refreshTokenId: authResponse.refreshTokenId
  };
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    return this.tokenService.validateTokenAndGetUser(payload);
  }

  private async simulateDelay() {
    return new Promise((resolve) => setTimeout(resolve, AuthConfig.SIMULATED_DELAY_MS));
  }

  async refreshAccessToken(token: string, ipAddress?: string, userAgent?: string) {
    return this.sessionService.refreshAccessToken(token, ipAddress, userAgent);
  }

  async status(userFromJwt: AuthenticatedUser) {
    // We delegate status retrieval to TokenService as well, or just use what we have.
    // However, status often requires a fresh check.
    // Since we removed userCacheService injection, we need to decide:
    // 1. Re-inject UserCacheService (but this defeats the refactor purpose if TokenService handles validation)
    // 2. Move status logic to TokenService (best).
    return this.tokenService.getFreshUserStatus(userFromJwt);
  }

  async logout(userId: string) {
    // Delegated to SessionService which manages session lifecycle
    await this.sessionService.terminateAllSessions(userId);
    return { message: 'Sesión cerrada exitosamente.' };
  }

  async getUserSessions(userId: string) {
    return this.sessionService.getUserSessions(userId);
  }

  async revokeSession(userId: string, sessionId: string) {
    return this.sessionService.revokeSession(userId, sessionId);
  }

  async verifyUserFromToken(token: string): Promise<User | null> {
    return this.sessionService.verifyUserFromToken(token);
  }
}
