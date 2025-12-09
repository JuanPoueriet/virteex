
import { Module } from '@nestjs/common';
import { CommonController } from './controllers/common.controller';
import { ConfigController } from './controllers/config.controller';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
    imports: [UsersModule, OrganizationsModule],
    controllers: [CommonController, ConfigController],
})
export class CommonModule {}
