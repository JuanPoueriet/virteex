
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoUtil {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly ivLength = 16;

  constructor(private configService: ConfigService) {
    const secret = this.configService.get<string>('ENCRYPTION_SECRET') || 'virteex-erp-secret-key-32-chars!!';
    // Ensure key is 32 bytes
    this.key = crypto.scryptSync(secret, 'salt', 32);
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decrypt(text: string): string {
    const textParts = text.split(':');
    if (textParts.length !== 2) {
         // Fallback for legacy plain text if migration hasn't run or during transition
         // NOTE: In production, you'd want a strict check, but for now we assume format is IV:Encrypted
         return text;
    }
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}
