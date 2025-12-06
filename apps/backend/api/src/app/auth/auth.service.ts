
import {
  Injectable,
  UnauthorizedException,
  Logger
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as ms from 'ms';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { LoginUserDto } from './dto/login-user.dto';
import { User, UserStatus } from '../users/entities/user.entity/user.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthConfig } from './auth.config';
import { UserCacheService } from './modules/user-cache.service';
import { UsersService } from '../users/users.service';
import { SessionService } from './services/session.service';
import { SecurityAnalysisService } from './services/security-analysis.service';
import { TokenService } from './services/token.service';
import { MfaOrchestratorService } from './services/mfa-orchestrator.service';
import { PasswordService } from './services/password.service';
import { AuthEvents, AuthLoginFailedEvent, AuthLoginSuccessEvent, AuthImpersonateEvent } from './events/auth.events';

export type LoginResult =
  | { user: any; accessToken: string; refreshToken: string; refreshTokenId: string }
  | { require2fa: true; tempToken: string; message: string };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userCacheService: UserCacheService,
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
      const remainingTime = Math.ceil(
        (user.security.lockoutUntil.getTime() - Date.now()) / (1000 * 60),
      );
      throw new UnauthorizedException(
        `Cuenta bloqueada temporalmente. Intente nuevamente en ${remainingTime} minutos.`,
      );
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
              await this.handleFailedLoginAttempt(user);
              this.eventEmitter.emit(
                  AuthEvents.LOGIN_FAILED,
                  new AuthLoginFailedEvent(user.id, user.email, 'Invalid Credentials', ipAddress, userAgent)
              );
          }
          await this.simulateDelay();
          throw new UnauthorizedException('Credenciales no válidas');
    }

    if (user.status !== UserStatus.ACTIVE) {
       this.eventEmitter.emit(
           AuthEvents.LOGIN_FAILED,
           new AuthLoginFailedEvent(user.id, user.email, 'User Inactive/Blocked', ipAddress, userAgent)
       );
      throw new UnauthorizedException(
        'Usuario inactivo o pendiente, por favor contacte al administrador.',
      );
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
      return result;
    }

    await this.securityAnalysisService.checkImpossibleTravel(user.id, ipAddress);

    await this.resetLoginAttempts(user);

    this.eventEmitter.emit(
        AuthEvents.LOGIN_SUCCESS,
        new AuthLoginSuccessEvent(user.id, user.email, ipAddress, userAgent)
    );

    return await this.tokenService.generateAuthResponse(user, {}, ipAddress, userAgent);
  }

  async validate(payload: JwtPayload): Promise<any> {
    let user = await this.userCacheService.getUser(payload.id);

    if (!user) {
      user = await this.usersService.findUserByIdForAuth(payload.id);

      if (user) {
        await this.userCacheService.setUser(payload.id, user, AuthConfig.CACHE_TTL);
      }
    }

    if (!user || user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Token inválido o usuario bloqueado.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Usuario inactivo o pendiente, por favor contacte al administrador.',
      );
    }

    const tokenVersion = user.security?.tokenVersion || 0;

    if (tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException(
        'La sesión ha expirado. Por favor, inicia sesión de nuevo.',
      );
    }

    const safeUser = this.tokenService.buildSafeUser(user);

    return {
      ...safeUser,
      isImpersonating: payload.isImpersonating,
      originalUserId: payload.originalUserId,
    };
  }

  private async simulateDelay() {
    return new Promise((resolve) => setTimeout(resolve, AuthConfig.SIMULATED_DELAY_MS));
  }

  async refreshAccessToken(token: string, ipAddress?: string, userAgent?: string) {
    return this.sessionService.refreshAccessToken(token, ipAddress, userAgent);
  }

  async status(userFromJwt: any) {
    let freshUser = await this.userCacheService.getUser(userFromJwt.id);

    if (!freshUser) {
        freshUser = await this.usersService.findUserByIdForAuth(userFromJwt.id);

        if (freshUser) {
            await this.userCacheService.setUser(userFromJwt.id, freshUser, AuthConfig.CACHE_TTL);
        }
    }

    if (!freshUser) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const safeUser = this.tokenService.buildSafeUser(freshUser);

    const userWithImpersonationStatus = {
      ...safeUser,
      isImpersonating: userFromJwt.isImpersonating || false,
      originalUserId: userFromJwt.originalUserId || undefined,
    };

    return { user: userWithImpersonationStatus };
  }


  async logout(userId: string) {
    await this.userCacheService.clearUserSession(userId);
    return { message: 'Sesión cerrada exitosamente.' };
  }

  async getUserSessions(userId: string) {
    return this.sessionService.getUserSessions(userId);
  }

  async revokeSession(userId: string, sessionId: string) {
    return this.sessionService.revokeSession(userId, sessionId);
  }

  private async handleFailedLoginAttempt(user: User) {
    if (!user.security) return;

    const MAX_FAILED_ATTEMPTS = 5;
    const LOCKOUT_MINUTES = 15;

    user.security.failedLoginAttempts = (user.security.failedLoginAttempts || 0) + 1;

    if (user.security.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutTime = new Date();
      lockoutTime.setMinutes(lockoutTime.getMinutes() + LOCKOUT_MINUTES);
      user.security.lockoutUntil = lockoutTime;
    }

    await this.usersService.save(user);
  }

  private async resetLoginAttempts(user: User) {
    if (user.security && (user.security.failedLoginAttempts > 0 || user.security.lockoutUntil)) {
      user.security.failedLoginAttempts = 0;
      user.security.lockoutUntil = null;
      await this.usersService.save(user);
    }
  }

  async verifyUserFromToken(token: string): Promise<User | null> {
    return this.sessionService.verifyUserFromToken(token);
  }

  async sendPhoneOtp(userId: string, phoneNumber: string) {
    return this.mfaOrchestratorService.sendPhoneOtp(userId, phoneNumber);
  }

  async verifyPhoneOtp(userId: string, code: string, phoneNumber: string) {
    return this.mfaOrchestratorService.verifyPhoneOtp(userId, code, phoneNumber);
  }

  async sendLoginOtp(user: User) {
      return this.mfaOrchestratorService.sendLoginOtp(user);
  }

  async complete2faLogin(user: User, code: string, ipAddress?: string, userAgent?: string) {
     return this.mfaOrchestratorService.complete2faLogin(user, code, ipAddress, userAgent);
  }

  private convertToMs(time: string): number {
    return ms(time) as number;
  }
}
