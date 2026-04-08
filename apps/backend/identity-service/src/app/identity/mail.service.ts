import { Injectable } from '@nestjs/common';
@Injectable()
export class MailService {
    async sendPasswordResetEmail(user: any, token: string, expiresIn: string) {}
    async sendUserInvitation(user: any, token: string) {}
}
