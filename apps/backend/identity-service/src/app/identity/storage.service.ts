import { Injectable } from '@nestjs/common';
@Injectable()
export class StorageService {
    async uploadFile(file: any, path: string) { return { url: '' }; }
}
