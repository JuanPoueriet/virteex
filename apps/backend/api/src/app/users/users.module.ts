
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { User } from './entities/user.entity/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UsersService } from './users.service';

import { UsersController } from './users.controller';
import { MailModule } from '../mail/mail.module';
import { RolesModule } from '../roles/roles.module';
import { WebsocketsModule } from '../websockets/websockets.module';
import { UserCacheService } from '../auth/services/user-cache.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Organization]),
    RolesModule,
    MailModule,
    WebsocketsModule,
    CacheModule.register() // Needed for UserCacheService or internal cache usage if any
  ],

  controllers: [UsersController],
  providers: [UsersService, UserCacheService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
