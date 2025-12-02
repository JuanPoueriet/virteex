

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetPasswordFromInvitationDto } from './dto/set-password-from-invitation.dto';
import { User, UserStatus } from '../users/entities/user.entity/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Role } from '../roles/entities/role.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { MailService } from '../mail/mail.service';
import { LocalizationService } from '../localization/services/localization.service';

interface PasswordResetJwtPayload {
  sub: string;
  email: string;
}

const SALT_ROUNDS = 10;
const DEFAULT_RESET_EXPIRATION = '15m';
const DEFAULT_ACCESS_EXPIRATION = '2h';
const DEFAULT_ACCESS_EXPIRATION_SHORT = '15m';
const DEFAULT_REFRESH_EXPIRATION = '7d';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly localizationService: LocalizationService,
  ) {}






  async register(registerUserDto: RegisterUserDto) {
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
        throw new ConflictException('El correo electrónico ya está registrado');
      }
      if (rnc) {
        const existingOrg = await queryRunner.manager.findOne(Organization, {
          where: { taxId: rnc },
        });
        if (existingOrg) {
          throw new ConflictException('El RNC ya está registrado');
        }
      }


      organization = queryRunner.manager.create(Organization, {
        legalName: organizationName,
        taxId: rnc || null,
        fiscalRegionId: fiscalRegionId,
      });
      await queryRunner.manager.save(organization);


      const defaultRoles = this.getDefaultRolesForOrganization(organization.id);
      const roleEntities = defaultRoles.map((role) =>
        queryRunner.manager.create(Role, { ...role }),
      );
      await queryRunner.manager.save(roleEntities);

      const adminRole = roleEntities.find((r) => r.name === 'ADMINISTRATOR');
      if (!adminRole) {
        throw new InternalServerErrorException(
          'No se pudo encontrar el rol de administrador predeterminado.',
        );
      }


      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
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

      await queryRunner.commitTransaction();


      user.organization = organization;
      user.roles = [adminRole];

      const authResponse = this.generateAuthResponse(user);

      return {
        user: authResponse.user,
        accessToken: authResponse.accessToken,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ConflictException) {
        throw error;
      }
      console.error('Error en el registro:', error);
      throw new InternalServerErrorException(
        'Error inesperado, por favor revise los logs del servidor.',
      );
    } finally {
      await queryRunner.release();
      if (organization) {
        this.localizationService
          .applyFiscalPackage(organization)
          .catch((err) => {
            console.error(
              `Error al aplicar el paquete fiscal para la organización ${organization!.id}:`,
              err,
            );
          });
      }
    }
  }


  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('user.organization', 'organization')
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
        'role.id',
        'role.name',
        'role.permissions',
        'organization.id',
        'organization.legalName',
        'organization.rnc',
        'organization.logo_url',
      ])
      .getOne();

    if (user && user.lockoutUntil && new Date() < user.lockoutUntil) {
      const remainingTime = Math.ceil(
        (user.lockoutUntil.getTime() - Date.now()) / (1000 * 60),
      );
      throw new UnauthorizedException(
        `Cuenta bloqueada temporalmente. Intente nuevamente en ${remainingTime} minutos.`,
      );
    }

    if (
      !user ||
      !user.passwordHash ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      if (user) await this.handleFailedLoginAttempt(user);
      throw new UnauthorizedException('Credenciales no válidas');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Usuario inactivo o pendiente, por favor contacte al administrador.',
      );
    }

    await this.resetLoginAttempts(user);

    return this.generateAuthResponse(user);
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
  ): Promise<void> {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOneBy({ email });
    if (!user) return;

    const expirationTime =
      this.configService.get<string>('JWT_RESET_PASSWORD_EXPIRATION_TIME') ||
      DEFAULT_RESET_EXPIRATION;

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

    const isSamePassword = await bcrypt.compare(password, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la anterior',
      );
    }

    user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

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

    user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    user.status = UserStatus.ACTIVE;
    user.invitationToken = undefined;
    user.invitationTokenExpires = undefined;

    await this.userRepository.save(user);

    return this.generateAuthResponse(user);
  }


  async refreshAccessToken(token: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

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

      return {
        user: this.buildSafeUser(user),
        accessToken: this.getJwtToken(
          this.buildPayload(user),
          DEFAULT_ACCESS_EXPIRATION_SHORT,
        ),
      };
    } catch (error) {
      console.error(
        'Error al verificar el refresh token:',
        (error as Error).message,
      );
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
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
    const hasPermission = adminUser.roles.some(
      (role) =>
        role.permissions.includes('*') ||
        role.permissions.includes('users:impersonate'),
    );
    if (!hasPermission) {
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

    return this.generateAuthResponse(targetUser, {
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

    return this.generateAuthResponse(adminUser);
  }





  private getDefaultRolesForOrganization(organizationId: string) {

    return [
      {
        name: 'ADMINISTRATOR',
        description: 'USER.ROLE.ADMINISTRATOR_DESC',
        permissions: ['*'],
        isSystemRole: true,
        organizationId,
      },
      {
        name: 'MEMBER',
        description: 'USER.ROLE.MEMBER_DESC',
        permissions: ['invoices:view', 'products:view'],
        isSystemRole: true,
        organizationId,
      },
      {
        name: 'SELLER',
        description: 'USER.ROLE.SELLER_DESC',
        permissions: [
          'dashboard:view',
          'customers:view',
          'customers:create',
          'customers:edit',
          'products:view',
          'sales:create',
          'invoices:view',
          'invoices:create',
          'invoices:edit',
        ],
        isSystemRole: true,
        organizationId,
      },
      {
        name: 'ACCOUNTANT',
        description: 'USER.ROLE.ACCOUNTANT_DESC',
        permissions: [
          'dashboard:view',
          'accounting:view',
          'reports:view',
          'customers:view',
          'suppliers:view',
          'invoices:view',
          'bills:view',
          'journal-entries:create',
          'journal-entries:view',
          'chart-of-accounts:view',
          'chart-of-accounts:edit',
        ],
        isSystemRole: true,
        organizationId,
      },
    ];
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
    const { passwordHash, ...safeUser } = user;
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
    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roles: user.roles.map((r) => r.name),
      permissions: [...new Set(user.roles.flatMap((r) => r.permissions))],
      tokenVersion: user.tokenVersion,
      ...extra,
    };
  }

  private generateAuthResponse(
    user: User,
    extraPayload: Partial<JwtPayload> = {},
  ) {
    const payload = this.buildPayload(user, extraPayload);
    const safeUser = this.buildSafeUser(user);


    const userWithImpersonationStatus = {
      ...safeUser,
      isImpersonating: payload.isImpersonating || false,
      originalUserId: payload.originalUserId || undefined,
    };

    return {
      user: userWithImpersonationStatus,
      accessToken: this.getJwtToken(payload, DEFAULT_ACCESS_EXPIRATION_SHORT),
      refreshToken: this.getJwtToken(
        payload,
        DEFAULT_REFRESH_EXPIRATION,
        this.configService.get('JWT_REFRESH_SECRET'),
      ),
    };
  }

  private getJwtToken(
    payload: JwtPayload,
    expiresIn?: string,
    secret?: string,
  ) {
    return this.jwtService.sign(payload, {
      secret: secret || this.configService.get('JWT_SECRET'),
      expiresIn: expiresIn || DEFAULT_ACCESS_EXPIRATION,
    });
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

    const match = /^(\d+)([mhd])$/i.exec(time);
    if (!match) {
      return 15 * 60 * 1000;
    }
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
  }
}
