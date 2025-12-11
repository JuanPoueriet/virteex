import { Module, forwardRef } from '@nestjs/common'; // [!code ++]
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { Role } from '@virteex/api/data-access-models';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role]), 
    forwardRef(() => AuthModule) // [!code ++] // Usa forwardRef aquí
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}