import { Injectable } from '@nestjs/common';
@Injectable()
export class LocalizationService {
    translate(key: string) { return key; }
}
