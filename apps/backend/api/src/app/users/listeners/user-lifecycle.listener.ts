import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../../mail/mail.service';
import { EventsGateway } from '../../websockets/events.gateway';
import { UserInvitedEvent } from '../events/user-invited.event';
import { UserStatusChangedEvent } from '../events/user-status-changed.event';
import { UserForcedLogoutEvent } from '../events/user-forced-logout.event';
import { UserPasswordResetEvent } from '../events/user-password-reset.event';
import { UserOnlineStatusChangedEvent } from '../events/user-online-status-changed.event';
import { UserStatus } from '../entities/user.entity/user.entity';

@Injectable()
export class UserLifecycleListener {
  private readonly logger = new Logger(UserLifecycleListener.name);

  constructor(
    private readonly mailService: MailService,
    private readonly eventsGateway: EventsGateway
  ) {}

  @OnEvent(UserInvitedEvent.name)
  async handleUserInvited(event: UserInvitedEvent) {
    this.logger.log(`Handling UserInvitedEvent for ${event.user.email}`);
    try {
      await this.mailService.sendUserInvitation(event.user, event.token);
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${event.user.email}`, error);
      // In a real system, we might want to queue a retry or alert admins.
    }
  }

  @OnEvent(UserStatusChangedEvent.name)
  async handleUserStatusChanged(event: UserStatusChangedEvent) {
    this.logger.log(`Handling UserStatusChangedEvent for ${event.user.id} to ${event.status}`);
    // If user is blocked, we might want to notify them via socket if they are connected?
    // The original logic only did this in 'blockAndLogout' via 'force-logout' message.
    // But 'force-logout' logic is separate now.
    // So 'UserStatusChangedEvent' might strictly be for logging or other side effects in future.
    // For now, we leave it as a hook.
  }

  @OnEvent(UserForcedLogoutEvent.name)
  async handleUserForcedLogout(event: UserForcedLogoutEvent) {
    this.logger.log(`Handling UserForcedLogoutEvent for ${event.userId}`);
    this.eventsGateway.sendToUser(event.userId, 'force-logout', {
      reason: event.reason,
    });
  }

  @OnEvent(UserPasswordResetEvent.name)
  async handleUserPasswordReset(event: UserPasswordResetEvent) {
    this.logger.log(`Handling UserPasswordResetEvent for ${event.user.email}`);
    try {
      await this.mailService.sendPasswordResetEmail(event.user, event.token, '1h');
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${event.user.email}`, error);
    }
  }

  @OnEvent(UserOnlineStatusChangedEvent.name)
  async handleUserOnlineStatusChanged(event: UserOnlineStatusChangedEvent) {
    this.logger.log(`Handling UserOnlineStatusChangedEvent for ${event.userId}: ${event.isOnline}`);
    this.eventsGateway.server.emit('user-status-update', {
      userId: event.userId,
      isOnline: event.isOnline,
    });
  }
}
