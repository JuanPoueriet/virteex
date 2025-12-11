import { Request } from 'express';
import { AuthenticatedUser } from '@virteex/api/auth-shared';

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
