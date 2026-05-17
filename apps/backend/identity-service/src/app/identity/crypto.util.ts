import { Injectable } from '@nestjs/common';
@Injectable()
export class CryptoUtil {
    encrypt(text: string): string { return text; }
    decrypt(text: string): string { return text; }
}
