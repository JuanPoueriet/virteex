import { Injectable } from '@nestjs/common';
@Injectable()
export class AuditService {
    async create(data: any) { return data; }
}
