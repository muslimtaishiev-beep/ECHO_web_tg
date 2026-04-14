import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://echo-web-tg.vercel.app',
    ],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track socket → roomId mapping
  private socketRoomMap: Map<string, string> = new Map();
  // Track volunteer socket → volunteerId
  private volunteerSockets: Map<string, string> = new Map();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`🔌 Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Client disconnected: ${client.id}`);

    // Clean up queue if teenager disconnects while waiting
    const roomId = this.chatService.findQueueBySocketId(client.id);
    if (roomId) {
      this.chatService.removeFromQueue(roomId);
      // Notify volunteers that queue changed
      this.server
        .to('volunteers')
        .emit('queue:updated', this.chatService.getQueue());
    }

    // Clean up room mapping
    const mappedRoom = this.socketRoomMap.get(client.id);
    if (mappedRoom) {
      // Notify the other person in the room
      this.server.to(mappedRoom).emit('partner:disconnected');
      this.socketRoomMap.delete(client.id);
    }

    // Clean up volunteer socket
    this.volunteerSockets.delete(client.id);
  }

  /**
   * Teenager requests a chat
   */
  @SubscribeMessage('chat:request')
  async handleChatRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { nickname: string; mood: string; topic: string; sessionId: string; userToken?: string },
  ) {
    let userId: string | undefined = undefined;

    if (data.userToken) {
      try {
        const decoded = this.jwtService.verify(data.userToken);
        if (decoded && decoded.role === 'user') {
          userId = decoded.sub;
        }
      } catch (e) {
        console.warn('Invalid user token in chat:request');
      }
    }

    const room = await this.chatService.createRoom(
      data.nickname,
      data.mood,
      data.topic || 'general',
      data.sessionId,
      userId,
    );

    // Add to queue
    this.chatService.addToQueue(room.id, client.id, data.mood, data.nickname);

    // Join the socket room
    client.join(room.id);
    this.socketRoomMap.set(client.id, room.id);

    // Notify the teenager
    client.emit('chat:waiting', { roomId: room.id });

    // Notify all volunteers that queue updated
    this.server
      .to('volunteers')
      .emit('queue:updated', this.chatService.getQueue());

    return { roomId: room.id };
  }

  /**
   * Volunteer joins the volunteer channel
   */
  @SubscribeMessage('volunteer:join')
  async handleVolunteerJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { volunteerId: string },
  ) {
    client.join('volunteers');
    this.volunteerSockets.set(client.id, data.volunteerId);

    // Send current queue
    client.emit('queue:updated', this.chatService.getQueue());

    return { status: 'joined' };
  }

  /**
   * Volunteer accepts a chat from the queue
   */
  @SubscribeMessage('chat:accept')
  async handleChatAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; volunteerId: string },
  ) {
    const room = await this.chatService.acceptChat(
      data.roomId,
      data.volunteerId,
    );

    // Join the socket room
    client.join(data.roomId);
    this.socketRoomMap.set(client.id, data.roomId);

    // Notify the teenager that a volunteer joined
    this.server.to(data.roomId).emit('chat:started', {
      roomId: data.roomId,
      volunteerName: room.volunteer?.displayName || 'Волонтёр',
    });

    // Update queue for all volunteers
    this.server
      .to('volunteers')
      .emit('queue:updated', this.chatService.getQueue());

    return { status: 'accepted', roomId: data.roomId };
  }

  /**
   * Send a message (from either side)
   */
  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomId: string; content: string; senderType: 'anon' | 'volunteer' },
  ) {
    const message = await this.chatService.saveMessage(
      data.roomId,
      data.content,
      data.senderType,
    );

    // Broadcast to everyone in the room (including sender)
    this.server.to(data.roomId).emit('message:new', message);

    return { status: 'sent', messageId: message.id };
  }

  /**
   * Typing indicator
   */
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; senderType: string },
  ) {
    client.to(data.roomId).emit('typing:show', { senderType: data.senderType });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; senderType: string },
  ) {
    client.to(data.roomId).emit('typing:hide', { senderType: data.senderType });
  }

  /**
   * Ping check from client (useful if socket reconnected during waiting phase)
   */
  @SubscribeMessage('chat:check_status')
  async handleChatCheckStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    if (!data.roomId) return;
    
    const room = await this.chatService.checkRoomStatus(data.roomId);
    if (!room) return;

    // Ensure socket is in the right room, in case it was a reconnection
    client.join(data.roomId);
    this.socketRoomMap.set(client.id, data.roomId);

    if (room.status === 'active') {
      client.emit('chat:started', {
        roomId: room.id,
        volunteerName: room.volunteer?.displayName || 'Волонтёр',
      });
    } else if (room.status === 'closed') {
      client.emit('chat:ended', { roomId: room.id });
    }
  }

  /**
   * Listen for events from the Telegram bridge
   */
  @OnEvent('telegram.chat_accepted')
  handleTelegramChatAccepted(payload: {
    roomId: string;
    volunteerName: string;
  }) {
    this.server.to(payload.roomId).emit('chat:started', {
      roomId: payload.roomId,
      volunteerName: payload.volunteerName,
    });
    this.server
      .to('volunteers')
      .emit('queue:updated', this.chatService.getQueue());
  }

  @OnEvent('telegram.message')
  async handleTelegramMessage(payload: {
    roomId: string;
    content: string;
    senderType: string;
  }) {
    this.server.to(payload.roomId).emit('message:new', {
      id: Math.random().toString(36).substr(2, 9), // Temporary ID helper
      senderType: payload.senderType,
      content: payload.content,
      createdAt: new Date(),
    });
  }

  @OnEvent('telegram.chat_closed')
  handleTelegramChatClosed(payload: { roomId: string }) {
    this.server
      .to(payload.roomId)
      .emit('chat:ended', { roomId: payload.roomId });
    this.server
      .to('volunteers')
      .emit('queue:updated', this.chatService.getQueue());
  }

  /**
   * Bot user message forwarded to web volunteer
   */
  @OnEvent('telegram.bot_user_message')
  handleBotUserMessage(payload: {
    roomId: string;
    content: string;
  }) {
    this.server.to(payload.roomId).emit('message:new', {
      id: Math.random().toString(36).substr(2, 9),
      senderType: 'anon',
      content: payload.content,
      createdAt: new Date(),
    });
  }

  /**
   * Close chat
   */
  @SubscribeMessage('chat:close')
  async handleChatClose(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    await this.chatService.closeRoom(data.roomId);
    this.server.to(data.roomId).emit('chat:ended', { roomId: data.roomId });
    return { status: 'closed' };
  }
}
