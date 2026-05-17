import { Injectable } from '@nestjs/common';
@Injectable()
export class TwoFactorAuthService {
    async verifyBackupCode(user: any, code: string): Promise<boolean> { return false; }
}
