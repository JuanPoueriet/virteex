import { Injectable } from '@nestjs/common';
@Injectable()
export class EventsGateway {
    sendToUser(userId: string, event: string, data: any) {}
    server = { emit: (event: string, data: any) => {} };
}
