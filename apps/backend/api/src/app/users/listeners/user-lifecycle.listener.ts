import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../../mail/mail.service';
import { EventsGateway } from '../../websockets/events.gateway';
import { User } from '../entities/user.entity/user.entity';

@Injectable()
export class UserLifecycleListener {
  constructor(
    private readonly mailService: MailService,
    private readonly eventsGateway: EventsGateway
  ) {}

  @OnEvent('user.invited')
  async handleUserInvited(payload: { user: User; invitationToken: string }) {
    await this.mailService.sendUserInvitation(payload.user, payload.invitationToken);
  }

  @OnEvent('user.password_reset')
  async handlePasswordReset(payload: { user: User; resetToken: string; expiry: string }) {
     try {
      await this.mailService.sendPasswordResetEmail(payload.user, payload.resetToken, payload.expiry);
    } catch (error) {
      console.error(
        `Failed to send password reset email to ${payload.user.email}`,
        error,
      );
    }
  }

  @OnEvent('user.forced_logout')
  handleForceLogout(payload: { userId: string; reason?: string }) {
    this.eventsGateway.sendToUser(payload.userId, 'force-logout', {
      reason: payload.reason || 'Su sesión ha sido cerrada por un administrador.',
    });
  }

  @OnEvent('user.status_changed')
  handleUserStatusUpdate(payload: { userId: string; isOnline: boolean }) {
    this.eventsGateway.server.emit('user-status-update', payload);
  }
}
