
import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    // Allowing all origins; you can set a specific origin like 'http://localhost:4200' or use an env var
    origin: '*',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  // `server` is set by the decorator at runtime; mark as definitely assigned to satisfy TS strict checks
  server!: Server;

  private connectedUsers = new Map<string, string>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.headers.cookie
        ?.split('; ')
        .find((row) => row.startsWith('access_token='))
        ?.split('=')[1];
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      this.connectedUsers.set(payload.id, client.id);
      console.log(`User connected: ${payload.id}, socket: ${client.id}`);

      this.server.emit('user-status-update', {
        userId: payload.id,
        isOnline: true,
      });
    } catch (error) {
      console.error(error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.connectedUsers.delete(userId);
        console.log(`User disconnected: ${userId}`);

        this.server.emit('user-status-update', { userId, isOnline: false });
        break;
      }
    }
  }


  sendToUser(userId: string, event: string, data: unknown) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  @SubscribeMessage('user-status')
  handleUserStatus(client: Socket, payload: { isOnline: boolean }): void {
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.server.emit('user-status-update', {
          userId,
          isOnline: payload.isOnline,
        });
        break;
      }
    }
  }
}
