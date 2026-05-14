
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err: any, user: any, info: any, context: any, status?: any) {
    if (err || !user) {
      this.logger.error(`JWT Auth Failed: User=${!!user}, Error=${err?.message}, Info=${info?.message || info}`);
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
