
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsGateway } from '../../websockets/events.gateway';

@Injectable()
export class UserWebsocketListener {
  constructor(private readonly eventsGateway: EventsGateway) {}

  @OnEvent('user.forced_logout')
  handleUserForcedLogout(payload: { userId: string; reason: string }) {
    this.eventsGateway.sendToUser(payload.userId, 'force-logout', {
      reason: payload.reason,
    });
  }

  @OnEvent('user.status_updated')
  handleUserStatusUpdated(payload: { userId: string; isOnline: boolean }) {
    this.eventsGateway.server.emit('user-status-update', {
      userId: payload.userId,
      isOnline: payload.isOnline,
    });
  }
}
