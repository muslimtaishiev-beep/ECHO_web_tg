import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ChatService {
  // In-memory queue: teenagers waiting for a volunteer
  private waitingQueue: Map<
    string,
    {
      roomId: string;
      socketId: string;
      mood: string;
      nickname: string;
      joinedAt: Date;
    }
  > = new Map();

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a chat room when a teenager requests help
   */
  async createRoom(
    nickname: string,
    mood: string,
    topic: string,
    sessionId: string,
    userId?: string,
  ) {
    const roomKey = this.encryption.generateRoomKey();

    const room = await this.prisma.chatRoom.create({
      data: {
        anonNickname: nickname,
        anonSessionId: sessionId,
        mood,
        topic,
        encryptionKey: roomKey,
        status: 'waiting',
        source: 'web',
        userId,
      },
    });

    console.log(`[CHAT] Room created from web: ${room.id} (${nickname})`);
    this.eventEmitter.emit('room.created', room);

    return room;
  }

  /**
   * Create a chat room from Telegram bot (teen user)
   */
  async createRoomFromBot(
    nickname: string,
    mood: string,
    topic: string,
    sessionId: string,
    botUserId: string,
  ) {
    const roomKey = this.encryption.generateRoomKey();

    const room = await this.prisma.chatRoom.create({
      data: {
        anonNickname: nickname,
        anonSessionId: sessionId,
        mood,
        topic,
        encryptionKey: roomKey,
        status: 'waiting',
        source: 'telegram',
        botUserId,
      },
    });

    console.log(`[CHAT] Room created from bot: ${room.id} (${nickname})`);
    this.eventEmitter.emit('room.created', room);

    return room;
  }

  /**
   * Add teenager to the waiting queue
   */
  addToQueue(roomId: string, socketId: string, mood: string, nickname: string) {
    this.waitingQueue.set(roomId, {
      roomId,
      socketId,
      mood,
      nickname,
      joinedAt: new Date(),
    });
  }

  /**
   * Remove from queue
   */
  removeFromQueue(roomId: string) {
    this.waitingQueue.delete(roomId);
  }

  /**
   * Get the current waiting queue (for volunteer dashboard)
   */
  getQueue() {
    return Array.from(this.waitingQueue.values()).map((item) => ({
      roomId: item.roomId,
      mood: item.mood,
      nickname: item.nickname,
      waitingMinutes: Math.round(
        (Date.now() - item.joinedAt.getTime()) / 60000,
      ),
    }));
  }

  /**
   * Volunteer accepts a chat — link them to the room
   */
  async acceptChat(roomId: string, volunteerId: string) {
    const room = await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        volunteerId,
        status: 'active',
      },
      include: { volunteer: true },
    });

    this.removeFromQueue(roomId);
    this.eventEmitter.emit('chat.accepted', room);
    return room;
  }

  /**
   * Save an encrypted message
   */
  async saveMessage(
    roomId: string,
    plaintext: string,
    senderType: 'anon' | 'volunteer',
  ) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new Error('Room not found');

    const { encrypted, iv, authTag } = this.encryption.encrypt(
      plaintext,
      room.encryptionKey,
    );

    const message = await this.prisma.message.create({
      data: {
        content: encrypted,
        iv,
        authTag,
        senderType,
        chatRoomId: roomId,
      },
    });

    const result = {
      id: message.id,
      senderType: message.senderType,
      content: plaintext,
      createdAt: message.createdAt,
      chatRoomId: roomId,
    };

    if (senderType === 'anon') {
      this.eventEmitter.emit('message.from_anon', result);
    }

    return result;
  }

  /**
   * Get decrypted messages for a room
   */
  async getMessages(roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) return [];

    const messages = await this.prisma.message.findMany({
      where: { chatRoomId: roomId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((msg) => ({
      id: msg.id,
      senderType: msg.senderType,
      content: this.encryption.decrypt(
        msg.content,
        msg.iv,
        msg.authTag,
        room.encryptionKey,
      ),
      createdAt: msg.createdAt,
    }));
  }

  /**
   * Close a chat room
   */
  async closeRoom(roomId: string) {
    return this.prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        status: 'closed',
        closedAt: new Date(),
      },
    });
  }

  /**
   * Get active rooms for a volunteer
   */
  async getVolunteerRooms(volunteerId: string) {
    return this.prisma.chatRoom.findMany({
      where: {
        volunteerId,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get chat history for a registered user
   */
  async getUserHistory(userId: string) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { volunteer: { select: { displayName: true } } }
    });
    return rooms.map(r => ({
      id: r.id,
      topic: r.topic,
      mood: r.mood,
      status: r.status,
      volunteerName: r.volunteer?.displayName || null,
      createdAt: r.createdAt,
      closedAt: r.closedAt
    }));
  }

  /**
   * Find queue entry by socket ID (for disconnect cleanup)
   */
  findQueueBySocketId(socketId: string): string | null {
    for (const [roomId, entry] of this.waitingQueue.entries()) {
      if (entry.socketId === socketId) return roomId;
    }
    return null;
  }

  /**
   * Get platform statistics (public)
   */
  async getStats() {
    const totalRooms = await this.prisma.chatRoom.count();
    const totalMessages = await this.prisma.message.count();
    const totalVolunteers = await this.prisma.volunteer.count();
    const activeRooms = await this.prisma.chatRoom.count({
      where: { status: 'active' },
    });
    const queueLength = this.waitingQueue.size;

    return {
      totalRooms,
      totalMessages,
      totalVolunteers,
      activeRooms,
      queueLength,
    };
  }

  /**
   * Check room status (used for reconnects/polling)
   */
  async checkRoomStatus(roomId: string) {
    return this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { volunteer: true },
    });
  }

  /**
   * Retrieve active or waiting room for a given session (used for reconnection)
   */
  async getActiveRoomForSession(sessionId: string, userId?: string) {
    const where: any = {
      status: { in: ['waiting', 'active'] },
    };
    // Prioritize userId if logged in, otherwise fallback to session
    if (userId) {
      where.userId = userId;
    } else {
      where.anonSessionId = sessionId;
    }

    return this.prisma.chatRoom.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      include: { volunteer: true },
    });
  }

  /**
   * Securely fetch decrypted messages if the session corresponds to the room creator
   */
  async getMessagesForSession(sessionId: string, roomId: string) {
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        OR: [
          { anonSessionId: sessionId },
          // If we had a robust way to link user token here, we would.
          // For now, this endpoint relies on sessionId match (or anonymous users).
        ]
      }
    });

    if (!room) {
      throw new Error('Room not found or unauthorized for this session');
    }

    const messages = await this.prisma.message.findMany({
      where: { chatRoomId: roomId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((msg) => ({
      id: msg.id,
      senderType: msg.senderType,
      content: this.encryption.decrypt(
        msg.content,
        msg.iv,
        msg.authTag,
        room.encryptionKey,
      ),
      createdAt: msg.createdAt,
    }));
  }
}
