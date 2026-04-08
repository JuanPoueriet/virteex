import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { RolesService } from './roles.service';
import { UserCacheService } from './user-cache.service';
import { PasswordService } from './password.service';
import { GeoService } from './geo.service';
import { User } from './user.entity';
import { UserSecurity } from './user-security.entity';
import { Role } from './role.entity';
import { Passkey } from './passkey.entity';
import { RefreshToken } from './refresh-token.entity';
import { VerificationCode } from './verification-code.entity';
import { SaasService } from './saas.service';
import { MailService } from './mail.service';
import { IdentitySaasAdapter, IdentityMailAdapter } from './identity.adapters';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserSecurity, Role, Passkey, RefreshToken, VerificationCode]),
  ],
  providers: [
    UsersService,
    RolesService,
    UserCacheService,
    PasswordService,
    GeoService,
    SaasService,
    MailService,
    { provide: 'SaasPlanReader', useClass: IdentitySaasAdapter },
    { provide: 'MailNotifier', useClass: IdentityMailAdapter },
  ],
  exports: [
    UsersService,
    RolesService,
    UserCacheService,
    PasswordService,
    GeoService,
    SaasService,
    MailService,
    TypeOrmModule,
  ],
})
export class UsersInternalModule {}
