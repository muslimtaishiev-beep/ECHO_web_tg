import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Run every minute — close 'active' rooms with no new messages in the last 30 minutes.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleInactiveChatCleanup() {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);

    // Find active rooms that haven't been updated (i.e. no messages) in 30+ minutes
    // To do this simply, we find active rooms, include latest message, and check timestamps.
    const activeRooms = await this.prisma.chatRoom.findMany({
      where: { status: 'active' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    let closedCount = 0;
    for (const room of activeRooms) {
      const lastActivityTime = room.messages.length > 0 
        ? room.messages[0].createdAt 
        : room.createdAt;

      if (lastActivityTime < cutoff) {
        // Close the room
        await this.prisma.chatRoom.update({
          where: { id: room.id },
          data: { status: 'closed', closedAt: new Date() },
        });

        // Ensure reviews are generated if needed
        if (room.volunteerId) {
          await this.prisma.review.upsert({
            where: { chatRoomId: room.id },
            update: {},
            create: {
              chatRoomId: room.id,
              volunteerId: room.volunteerId,
            },
          });
        }

        // Notify both platforms to close chat UI
        this.eventEmitter.emit('telegram.chat_closed', { roomId: room.id });
        closedCount++;
      }
    }

    if (closedCount > 0) {
      this.logger.log(`🧹 Auto-closed ${closedCount} inactive chat(s)`);
    }
  }

  /**
   * Run every hour — delete messages and closed rooms older than 24 hours.
   * This ensures user privacy by not retaining chat data longer than necessary.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleMessageCleanup() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // 1. Delete messages from closed rooms older than 24h
    const deletedMessages = await this.prisma.message.deleteMany({
      where: {
        chatRoom: {
          status: 'closed',
          closedAt: { lt: cutoff },
        },
      },
    });

    // 2. Delete the closed rooms themselves
    const deletedRooms = await this.prisma.chatRoom.deleteMany({
      where: {
        status: 'closed',
        closedAt: { lt: cutoff },
      },
    });

    // 3. Clean up stale "waiting" rooms (no volunteer accepted in 30 minutes)
    const staleCutoff = new Date(Date.now() - 30 * 60 * 1000);
    const deletedStaleMessages = await this.prisma.message.deleteMany({
      where: {
        chatRoom: {
          status: 'waiting',
          createdAt: { lt: staleCutoff },
        },
      },
    });
    const deletedStaleRooms = await this.prisma.chatRoom.deleteMany({
      where: {
        status: 'waiting',
        createdAt: { lt: staleCutoff },
      },
    });

    if (
      deletedMessages.count > 0 ||
      deletedRooms.count > 0 ||
      deletedStaleRooms.count > 0
    ) {
      this.logger.log(
        `🧹 Cleanup: ${deletedMessages.count + deletedStaleMessages.count} messages, ` +
          `${deletedRooms.count + deletedStaleRooms.count} rooms deleted`,
      );
    }
  }

  /**
   * Run at midnight — log daily stats
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const roomsToday = await this.prisma.chatRoom.count({
      where: { createdAt: { gte: today } },
    });

    const messagesToday = await this.prisma.message.count({
      where: { createdAt: { gte: today } },
    });

    this.logger.log(
      `📊 Daily stats: ${roomsToday} rooms, ${messagesToday} messages today`,
    );
  }
}
