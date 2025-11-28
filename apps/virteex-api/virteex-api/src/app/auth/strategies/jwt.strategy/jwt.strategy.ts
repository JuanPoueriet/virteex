

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';

import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { User, UserStatus } from '../users/entities/user.entity/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    super({

      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request | undefined) => req?.cookies?.access_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<Partial<User>> {
    const { id, tokenVersion } = payload;


    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'status',
        'tokenVersion',
        'organizationId',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Token inválido: el usuario no existe.');
    }


    if (user.tokenVersion !== tokenVersion) {
      throw new UnauthorizedException(
        'La sesión ha sido invalidada. Por favor, inicia sesión de nuevo.',
      );
    }


    if (this.isDisallowedStatus(user.status)) {
      throw new UnauthorizedException(
        `El usuario se encuentra ${user.status.toLowerCase()}.`,
      );
    }


    const permissions = this.getPermissionsFromRoles(user.roles ?? []);


    return { ...user, permissions };
  }

  private isDisallowedStatus(status: UserStatus | undefined): boolean {
    return (
      status === UserStatus.BLOCKED ||
      status === UserStatus.INACTIVE ||
      status === UserStatus.ARCHIVED
    );
  }

  private getPermissionsFromRoles(roles: Array<{ permissions?: string[] }>): string[] {
    const perms = roles.flatMap((r) => r.permissions ?? []);
    return [...new Set(perms)];
  }
}