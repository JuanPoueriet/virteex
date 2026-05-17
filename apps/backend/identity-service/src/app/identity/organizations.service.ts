import { Injectable } from '@nestjs/common';
@Injectable()
export class OrganizationsService {
    async findOne(id: string) { return { id }; }
}
