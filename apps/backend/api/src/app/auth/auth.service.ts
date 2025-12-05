
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as ms from 'ms';
import { authenticator } from 'otplib';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetPasswordFromInvitationDto } from './dto/set-password-from-invitation.dto';
import { User, UserStatus } from '../users/entities/user.entity/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Role } from '../roles/entities/role.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { MailService } from '../mail/mail.service';
import { DEFAULT_ROLES } from '../config/roles.config';
import { RoleEnum } from '../roles/enums/role.enum';
import { AuthConfig } from './auth.config';
import { AuditTrailService } from '../audit/audit.service';
import { ActionType } from '../audit/entities/audit-log.entity';
import { UserCacheService } from './services/user-cache.service';
import { hasPermission } from '../../../../../../libs/shared/util-auth/src/index';
import { UserRegisteredEvent } from './events/user-registered.event';
import { CryptoUtil } from '../shared/utils/crypto.util';
import { OrganizationsService } from '../organizations/organizations.service';

interface PasswordResetJwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly auditService: AuditTrailService,
    private readonly userCacheService: UserCacheService,
    private readonly eventEmitter: EventEmitter2,
    private readonly cryptoUtil: CryptoUtil,
    private readonly organizationsService: OrganizationsService
  ) {}

  async register(registerUserDto: RegisterUserDto, ipAddress?: string, userAgent?: string) {
    const {
      email,
      rnc,
      password,
      organizationName,
      firstName,
      lastName,
      fiscalRegionId,
    } = registerUserDto;

    let organization: Organization | null = null;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email },
      });
      if (existingUser) {
        // Prevent User Enumeration Strategy:
        // 1. Simulate Delay (Timing Attack Mitigation)
        // 2. Send "Duplicate Registration" Email (if configured)
        // 3. Throw a generic error or 'ConflictException' but masked if desired.
        // The AI suggests "Return 200 OK", but that breaks auto-login flow which expects tokens.
        // We will stick to ConflictException but we ensure the user gets an email,
        // so if it was a valid user, they know.

        // Note: Sending email inside transaction? No, better outside or just fire and forget.
        // But we are in a transaction block. We can use mailService directly (it's not transactional usually).
        try {
            await this.mailService.sendDuplicateRegistrationEmail(email, existingUser.firstName);
        } catch (e) {
            this.logger.error('Failed to send duplicate registration email', e);
        }

        await this.simulateDelay();

        throw new ConflictException('No se pudo completar el registro. Verifique que los datos sean correctos o contacte soporte.');
      }
      if (rnc) {
        // Validation format is handled by DTO @IsRNC
        // We only check for uniqueness here
        const existingOrg = await queryRunner.manager.findOne(Organization, {
          where: { taxId: rnc },
        });
        if (existingOrg) {
          throw new ConflictException('No se pudo completar el registro. Verifique que los datos sean correctos o contacte soporte.');
        }
      }


      organization = await this.organizationsService.create({
        legalName: organizationName,
        taxId: rnc || null,
        fiscalRegionId: fiscalRegionId,
      }, queryRunner.manager);


      const defaultRoles = this.getDefaultRolesForOrganization(organization.id);
      const roleEntities = defaultRoles.map((role) =>
        queryRunner.manager.create(Role, { ...role }),
      );
      await queryRunner.manager.save(roleEntities);

      const adminRole = roleEntities.find((r) => r.name === RoleEnum.ADMINISTRATOR);
      if (!adminRole) {
        throw new InternalServerErrorException(
          'No se pudo encontrar el rol de administrador predeterminado.',
        );
      }


      const passwordHash = await argon2.hash(password);
      const user = queryRunner.manager.create(User, {
        firstName,
        lastName,
        email,
        passwordHash,
        organization,
        organizationId: organization.id,
        roles: [adminRole],
        status: UserStatus.ACTIVE,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      });
      await queryRunner.manager.save(user);

      // Apply Fiscal Package INSIDE the transaction via Event Emitter
      await this.eventEmitter.emitAsync(
        'user.registered',
        new UserRegisteredEvent(user, organization, queryRunner.manager)
      );

      await queryRunner.commitTransaction();


      user.organization = organization;
      user.roles = [adminRole];

      const authResponse = await this.generateAuthResponse(user, {}, ipAddress, userAgent);

      return {
        user: authResponse.user,
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Error en el registro:', error);
      throw new InternalServerErrorException(
        'Error inesperado, por favor revise los logs del servidor.',
      );
    } finally {
      await queryRunner.release();
    }
  }


  async login(loginUserDto: LoginUserDto & { twoFactorCode?: string }, ipAddress?: string, userAgent?: string) {
    const { email, password, twoFactorCode } = loginUserDto;

    const user = await this.findUserForLogin(email);

    if (user && user.lockoutUntil && new Date() < user.lockoutUntil) {
      const remainingTime = Math.ceil(
        (user.lockoutUntil.getTime() - Date.now()) / (1000 * 60),
      );
      throw new UnauthorizedException(
        `Cuenta bloqueada temporalmente. Intente nuevamente en ${remainingTime} minutos.`,
      );
    }

    // Timing attack mitigation: verify password even if user not found (with dummy hash)
    // or if user found but wrong password.
    // If user is null, we simulate argon2 time.
    let isPasswordValid = false;
    if (user && user.passwordHash) {
        isPasswordValid = await argon2.verify(user.passwordHash, password);
    } else {
        // Dummy comparison to simulate time (using a fixed dummy hash)
        // This prevents timing leaks revealing if email exists
        try {
            await argon2.verify(AuthConfig.DUMMY_PASSWORD_HASH, password);
        } catch (e) {
            // Ignore error
        }
        isPasswordValid = false;
    }

    if (!user || !isPasswordValid) {
      if (user) {
          await this.handleFailedLoginAttempt(user);
          await this.auditService.record(
            user.id,
            'User',
            user.id,
            ActionType.LOGIN_FAILED,
            { email: user.email, reason: 'Invalid Credentials' },
            undefined
          );
      }
      await this.simulateDelay(); // Additional Safe delay
      throw new UnauthorizedException('Credenciales no válidas');
    }

    if (user.status !== UserStatus.ACTIVE) {
       await this.auditService.record(
            user.id,
            'User',
            user.id,
            ActionType.LOGIN_FAILED,
            { email: user.email, reason: 'User Inactive/Blocked' },
            undefined
       );
      throw new UnauthorizedException(
        'Usuario inactivo o pendiente, por favor contacte al administrador.',
      );
    }

    // 2FA Check
    if (user.isTwoFactorEnabled) {
      if (!twoFactorCode) {
        throw new ForbiddenException('Se requiere código de autenticación de dos factores (2FA).');
      }

      // Decrypt Secret before verify
      const decryptedSecret = this.cryptoUtil.decrypt(user.twoFactorSecret);
      const isValid2FA = authenticator.verify({
        token: twoFactorCode,
        secret: decryptedSecret
      });

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
    }

    await this.resetLoginAttempts(user);

    await this.auditService.record(
        user.id,
        'User',
        user.id,
        ActionType.LOGIN,
        { email: user.email, ipAddress, userAgent },
        undefined,
    );

    return await this.generateAuthResponse(user, {}, ipAddress, userAgent);
  }


  async validate(payload: JwtPayload): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: payload.id },
      relations: ['roles', 'organization'],
    });

    if (!user || user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Token inválido o usuario bloqueado.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Usuario inactivo o pendiente, por favor contacte al administrador.',
      );
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException(
        'La sesión ha expirado. Por favor, inicia sesión de nuevo.',
      );
    }

    const safeUser = this.buildSafeUser(user);

    return {
      ...safeUser,
      isImpersonating: payload.isImpersonating,
      originalUserId: payload.originalUserId,
    };
  }


  public async sendPasswordResetLink(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;
    const genericMessage = 'Si existe una cuenta con ese correo, se ha enviado un enlace para restablecer la contraseña.';

    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      await this.simulateDelay();
      return { message: genericMessage };
    }

    const expirationTime = AuthConfig.JWT_RESET_PASSWORD_EXPIRATION;

    const token = await this._generatePasswordResetToken(
      user.id,
      user.email,
      expirationTime,
    );

    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(
      Date.now() + this.convertToMs(expirationTime),
    );
    await this.userRepository.save(user);

    await this.mailService.sendPasswordResetEmail(user, token, expirationTime);

    return { message: genericMessage };
  }

  private async simulateDelay() {
    // Retardo fijo de 500ms (configurable) para mitigar timing attacks de forma segura y predecible
    return new Promise((resolve) => setTimeout(resolve, AuthConfig.SIMULATED_DELAY_MS));
  }

  private async findUserForLogin(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('user.organization', 'organization')
      .addSelect('user.twoFactorSecret')
      .addSelect('user.isTwoFactorEnabled')
      .where('user.email = :email', { email })
      .select([
        'user.id',
        'user.email',
        'user.passwordHash',
        'user.status',
        'user.organizationId',
        'user.firstName',
        'user.lastName',
        'user.preferredLanguage',
        'user.failedLoginAttempts',
        'user.lockoutUntil',
        'user.tokenVersion',
        'user.twoFactorSecret',
        'user.isTwoFactorEnabled',
        'role.id',
        'role.name',
        'role.permissions',
        'organization.id',
        'organization.legalName',
        'organization.taxId',
        // 'organization.logoUrl', // Optimized: Logo not needed for auth payload
      ])
      .getOne();
  }


  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<User> {
    const { token, password } = resetPasswordDto;

    let payload: PasswordResetJwtPayload;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_RESET_PASSWORD_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const user = await this.userRepository.findOne({
      where: {
        id: payload.sub,
        passwordResetToken: token,
        passwordResetExpires: MoreThan(new Date()),
      },
      select: [
        'id',
        'email',
        'passwordHash',
        'passwordResetToken',
        'passwordResetExpires',
        'tokenVersion'
      ],
    });

    if (!user) {
      throw new NotFoundException(
        'El token de restablecimiento es inválido o ha expirado.',
      );
    }

    if (password.length < 8) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres.',
      );
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        'No se encontró una contraseña previa para este usuario.',
      );
    }

    const isSamePassword = await argon2.verify(user.passwordHash, password);
    if (isSamePassword) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la anterior',
      );
    }

    user.passwordHash = await argon2.hash(password);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    // Invalidate all existing sessions on password change
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    // Invalidate cache explicitly
    await this.userCacheService.clearUserSession(user.id);

    const updatedUser = await this.userRepository.save(user);
    const {
      passwordHash,
      passwordResetToken,
      passwordResetExpires,
      ...safeUser
    } = updatedUser;
    return safeUser as User;
  }


  async getInvitationDetails(token: string) {
    const user = await this.userRepository.findOne({
      where: {
        invitationToken: token,
        status: UserStatus.PENDING,
        invitationTokenExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new NotFoundException('Invitación no encontrada o expirada.');
    }

    return { firstName: user.firstName };
  }


  async setPasswordFromInvitation(
    setPasswordDto: SetPasswordFromInvitationDto,
  ) {
    const { token, password } = setPasswordDto;

    const user = await this.userRepository.findOne({
      where: {
        invitationToken: token,
        status: UserStatus.PENDING,
        invitationTokenExpires: MoreThan(new Date()),
      },
      relations: ['roles', 'organization'],
    });

    if (!user) {
      throw new UnauthorizedException(
        'El token de invitación es inválido o ha expirado.',
      );
    }

    user.passwordHash = await argon2.hash(password);
    user.status = UserStatus.ACTIVE;
    user.invitationToken = undefined;
    user.invitationTokenExpires = undefined;

    await this.userRepository.save(user);

    return await this.generateAuthResponse(user);
  }


  async refreshAccessToken(token: string, ipAddress?: string, userAgent?: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload & { jti?: string }>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // 1. Check if user exists and is valid
      const user = await this.userRepository.findOne({
        where: { id: payload.id },
        relations: ['roles', 'organization'],
      });

      if (!user) {
        throw new UnauthorizedException('El usuario del token ya no existe.');
      }
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('El usuario del token está inactivo.');
      }

      // 2. Refresh Token Rotation Logic
      if (payload.jti) {
         const refreshTokenEntity = await this.refreshTokenRepository.findOneBy({ id: payload.jti });

         // Reuse Detection
         if (!refreshTokenEntity || refreshTokenEntity.isRevoked) {
             // Grace Period Check (e.g. 10 seconds)
             // If the token was revoked very recently, it might be a race condition (frontend retry).
             // In this case, we deny the request but DO NOT invalidate the user session.
             const GRACE_PERIOD = AuthConfig.REFRESH_GRACE_PERIOD;
             if (refreshTokenEntity?.revokedAt && (Date.now() - refreshTokenEntity.revokedAt.getTime() < GRACE_PERIOD)) {
                 this.logger.warn(`[SECURITY] Refresh token reused within grace period. Denying request without invalidation.`);
                 throw new UnauthorizedException('Token inválido (rotación en progreso)');
             }

             this.logger.warn(`[SECURITY] Reuse detection: Refresh token ${payload.jti} was used but is revoked/missing. Invalidating user ${user.id}.`);
             user.tokenVersion = (user.tokenVersion || 0) + 1;
             await this.userRepository.save(user);
             await this.userCacheService.clearUserSession(user.id);
             throw new UnauthorizedException('Refresh token reutilizado. Sesión invalidada.');
         }

         // Fingerprint Validation
         if (refreshTokenEntity.userAgent && userAgent && refreshTokenEntity.userAgent !== userAgent) {
             this.logger.warn(`[SECURITY] User Agent mismatch. Token created with ${refreshTokenEntity.userAgent}, used with ${userAgent}. Revoking.`);
             // Revoke this token, but maybe not the whole family unless suspicious?
             // Safer to revoke.
             refreshTokenEntity.isRevoked = true;
             refreshTokenEntity.revokedAt = new Date();
             await this.refreshTokenRepository.save(refreshTokenEntity);
             throw new UnauthorizedException('Cambio de dispositivo detectado. Por favor inicie sesión nuevamente.');
         }

         // IP Validation
         // We do NOT revoke tokens on IP change to support mobile users switching networks (WiFi <-> 4G).
         // We only log it for audit purposes.
         if (refreshTokenEntity.ipAddress && ipAddress && refreshTokenEntity.ipAddress !== ipAddress) {
             this.logger.log(`[SECURITY] IP Change for Refresh: ${refreshTokenEntity.ipAddress} -> ${ipAddress}`);
         }

         // Revoke the current token (Rotation)
         refreshTokenEntity.isRevoked = true;
         refreshTokenEntity.revokedAt = new Date();
         // Store which token replaced it (optional, for audit)
         // refreshTokenEntity.replacedByToken = newJti; // Can be implemented if needed
         await this.refreshTokenRepository.save(refreshTokenEntity);
      }

      // 3. Issue new pair
      const authResponse = await this.generateAuthResponse(user, {}, ipAddress, userAgent);

      await this.auditService.record(
        user.id,
        'User',
        user.id,
        ActionType.REFRESH,
        { email: user.email, ipAddress, userAgent },
      );

      return {
        user: authResponse.user,
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken, // New Refresh Token
      };
    } catch (error) {
      this.logger.error(
        'Error al verificar el refresh token:',
        (error as Error).message,
      );
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTokenCleanup() {
    this.logger.log('Starting expired refresh token cleanup...');
    const retentionPeriod = 30; // days
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - retentionPeriod);

    const result = await this.refreshTokenRepository.delete({
       expiresAt: LessThan(expirationDate)
    });

    // Also delete revoked tokens older than 30 days
    const resultRevoked = await this.refreshTokenRepository.delete({
        isRevoked: true,
        revokedAt: LessThan(expirationDate)
    });

    this.logger.log(`Cleanup complete. Deleted ${result.affected} expired tokens and ${resultRevoked.affected} revoked tokens.`);
  }


  async status(userFromJwt: any) {
    const freshUser = await this.userRepository.findOne({
      where: { id: userFromJwt.id },
      relations: ['roles', 'organization'],
    });

    if (!freshUser) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const safeUser = this.buildSafeUser(freshUser);

    const userWithImpersonationStatus = {
      ...safeUser,
      isImpersonating: userFromJwt.isImpersonating || false,
      originalUserId: userFromJwt.originalUserId || undefined,
    };

    return { user: userWithImpersonationStatus };
  }


  async impersonate(adminUser: User, targetUserId: string) {
    const permissions = [...new Set(adminUser.roles.flatMap((role) => role.permissions))];
    if (!hasPermission(permissions, ['users:impersonate'])) {
      throw new ForbiddenException(
        'No tienes permisos para suplantar usuarios.',
      );
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId, organizationId: adminUser.organizationId },
      relations: ['roles', 'organization'],
    });
    if (!targetUser) {
      throw new NotFoundException(
        'El usuario a suplantar no fue encontrado en tu organización.',
      );
    }

    return await this.generateAuthResponse(targetUser, {
      isImpersonating: true,
      originalUserId: adminUser.id,
    });
  }

  async stopImpersonation(impersonatingUser: User) {
    if (
      !impersonatingUser.isImpersonating ||
      !impersonatingUser.originalUserId
    ) {
      throw new BadRequestException(
        'No se encontró una sesión de suplantación activa para detener.',
      );
    }

    const adminUser = await this.userRepository.findOne({
      where: { id: impersonatingUser.originalUserId },
      relations: ['roles', 'organization'],
    });

    if (!adminUser) {
      throw new NotFoundException(
        'La cuenta del administrador original no fue encontrada.',
      );
    }
    if (adminUser.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'La cuenta del administrador original ya no está activa.',
      );
    }

    // Invalidate the impersonation session cache
    await this.userCacheService.clearUserSession(impersonatingUser.id);

    return await this.generateAuthResponse(adminUser);
  }

  async logout(userId: string) {
    // Just invalidate the cache to ensure next request hits DB (and any token version check therein)
    // Real logout with JWT is client-side, but if we want to ensure immediate rejection:
    await this.userCacheService.clearUserSession(userId);
    return { message: 'Sesión cerrada exitosamente.' };
  }

  // 2FA Methods Implemented
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


  private getDefaultRolesForOrganization(organizationId: string) {
    return DEFAULT_ROLES.map(role => ({
        ...role,
        organizationId
    }));
  }

  private async handleFailedLoginAttempt(user: User) {
    const MAX_FAILED_ATTEMPTS = 5;
    const LOCKOUT_MINUTES = 15;

    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutTime = new Date();
      lockoutTime.setMinutes(lockoutTime.getMinutes() + LOCKOUT_MINUTES);
      user.lockoutUntil = lockoutTime;
    }

    await this.userRepository.save(user);
  }

  private async resetLoginAttempts(user: User) {
    if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
      user.failedLoginAttempts = 0;
      user.lockoutUntil = null;
      await this.userRepository.save(user);
    }
  }

  private buildSafeUser(user: User) {
    const permissions = [
      ...new Set(user.roles.flatMap((role) => role.permissions)),
    ];
    const { passwordHash, twoFactorSecret, ...safeUser } = user;
    return {
      ...safeUser,
      permissions,
      organization: user.organization,
    };
  }

  private buildPayload(
    user: User,
    extra: Partial<JwtPayload> = {},
  ): JwtPayload {
    // Optimized: Permissions removed from JWT payload to reduce size.
    // Frontend should use permissions from the User object in the response or API calls,
    // not by decoding the token.
    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roles: user.roles.map((r) => r.name),
      tokenVersion: user.tokenVersion,
      ...extra,
    };
  }

  private async generateAuthResponse(
    user: User,
    extraPayload: Partial<JwtPayload> = {},
    ipAddress?: string,
    userAgent?: string
  ) {
    const payload = this.buildPayload(user, extraPayload);
    const safeUser = this.buildSafeUser(user);

    const userWithImpersonationStatus = {
      ...safeUser,
      isImpersonating: payload.isImpersonating || false,
      originalUserId: payload.originalUserId || undefined,
    };

    // Create Refresh Token Record
    const refreshExpiration = AuthConfig.JWT_REFRESH_EXPIRATION;
    const expirationDate = new Date(Date.now() + this.convertToMs(refreshExpiration));

    const refreshTokenRecord = this.refreshTokenRepository.create({
        user: user,
        userId: user.id,
        isRevoked: false,
        expiresAt: expirationDate,
        ipAddress,
        userAgent
    });

    await this.refreshTokenRepository.save(refreshTokenRecord);

    // Sign Access Token
    const accessToken = this.getJwtToken(payload, AuthConfig.JWT_ACCESS_EXPIRATION);

    // Sign Refresh Token including the JTI (JWT ID) referring to the DB record
    const refreshTokenPayload = { ...payload, jti: refreshTokenRecord.id };
    const refreshToken = this.getJwtToken(
        refreshTokenPayload,
        refreshExpiration,
        this.configService.get('JWT_REFRESH_SECRET'),
    );

    return {
      user: userWithImpersonationStatus,
      accessToken,
      refreshToken,
    };
  }

  private getJwtToken(
    payload: JwtPayload,
    expiresIn?: string,
    secret?: string,
  ) {
    return this.jwtService.sign(payload, {
      secret: secret || this.configService.getOrThrow('JWT_SECRET'),
      expiresIn: expiresIn || AuthConfig.JWT_ACCESS_EXPIRATION,
    });
  }

  async verifyUserFromToken(token: string): Promise<User | null> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.id },
        relations: ['roles', 'organization'],
      });

      if (!user || user.status !== UserStatus.ACTIVE || user.tokenVersion !== payload.tokenVersion) {
        return null;
      }

      return user;
    } catch (e) {
      return null;
    }
  }

  private async _generatePasswordResetToken(
    userId: string,
    email: string,
    expiresIn: string,
  ): Promise<string> {
    const payload: PasswordResetJwtPayload = { sub: userId, email };
    return await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_RESET_PASSWORD_SECRET'),
      expiresIn,
    });
  }

  private convertToMs(time: string): number {
    return ms(time) as number;
  }
}
