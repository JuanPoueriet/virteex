import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as ms from 'ms';

import { User } from '../../users/entities/user.entity/user.entity';
import { MailService } from '../../mail/mail.service';
import { UserCacheService } from './user-cache.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { SetPasswordFromInvitationDto } from '../dto/set-password-from-invitation.dto';
import { AuthConfig } from '../auth.config';
import { UserStatus } from '../../users/entities/user.entity/user.entity';

interface PasswordResetJwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class PasswordRecoveryService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly userCacheService: UserCacheService
  ) {}

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
    // Return user with passwordHash for AuthController to filter, or return safe user.
    // AuthController expects a User object, but filters it.
    // The previous implementation returned safeUser.
    return updatedUser;
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
  ): Promise<User> {
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

    return user;
  }

  private async simulateDelay() {
    return new Promise((resolve) => setTimeout(resolve, AuthConfig.SIMULATED_DELAY_MS));
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
