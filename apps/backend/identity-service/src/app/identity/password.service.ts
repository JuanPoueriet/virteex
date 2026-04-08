import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { IPasswordService } from './identity.interfaces';

@Injectable()
export class PasswordService implements IPasswordService {
  async hash(password: string): Promise<string> {
    return argon2.hash(password);
  }
  async verify(hash: string, password: string): Promise<boolean> {
    if (!hash || !password) return false;
    return argon2.verify(hash, password);
  }
  async verifyDummy(password: string): Promise<void> {
    await argon2.hash(password);
  }
}
