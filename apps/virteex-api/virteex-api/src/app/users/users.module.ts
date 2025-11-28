

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity/user.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
import { UsersService } from './users.service';

import { UsersController } from './users.controller';
import { MailModule } from 'src/mail/mail.module';
import { RolesModule } from 'src/roles/roles.module';
import { WebsocketsModule } from 'src/websockets/websockets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Organization]),
    RolesModule,
    MailModule,
    WebsocketsModule
  ],

  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
