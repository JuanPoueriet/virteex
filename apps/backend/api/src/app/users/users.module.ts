
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UsersService } from './users.service';

import { UsersController } from './users.controller';
import { MailModule } from '../mail/mail.module';
import { RolesModule } from '../roles/roles.module';
import { WebsocketsModule } from '../websockets/websockets.module';
import { UserSubscriber } from './subscribers/user.subscriber';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Organization]),
    RolesModule,
    MailModule,
    WebsocketsModule,
    forwardRef(() => AuthModule), // Import AuthModule to get correct UserCacheService configuration
  ],

  controllers: [UsersController],
  providers: [UsersService, UserSubscriber], // Removed UserCacheService to use the one from AuthModule
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
