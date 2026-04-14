import { Controller, Get, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  /**
   * Health check — public
   */
  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Platform stats — public (used on landing page)
   */
  @Get('stats')
  async getStats() {
    return this.chatService.getStats();
  }

  /**
   * Get queue (for volunteer dashboard - protected)
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('queue')
  getQueue() {
    return this.chatService.getQueue();
  }

  /**
   * Get messages for a room (protected)
   */
  @UseGuards(AuthGuard('jwt'))
  @Get(':roomId/messages')
  async getMessages(@Param('roomId') roomId: string) {
    return this.chatService.getMessages(roomId);
  }

  /**
   * Get volunteer's active rooms
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('rooms/:volunteerId')
  async getVolunteerRooms(@Param('volunteerId') volunteerId: string) {
    return this.chatService.getVolunteerRooms(volunteerId);
  }

  /**
   * Get authenticated user's chat history
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('user-history')
  async getUserHistory(@Req() req: any) {
    if (req.user.role !== 'user') {
      throw new ForbiddenException('Only registered users can access chat history');
    }
    return this.chatService.getUserHistory(req.user.sub);
  }

  /**
   * Auto-restore active or waiting chat for a user returning to the app
   */
  @Get('session/:sessionId/active-room')
  async getActiveRoom(@Param('sessionId') sessionId: string) {
    // If the user has a token, we could decode it here, but for now we trust sessionId
    const room = await this.chatService.getActiveRoomForSession(sessionId);
    if (!room) {
      return { active: false };
    }
    return {
      active: true,
      room: {
        id: room.id,
        status: room.status,
        volunteerName: room.volunteer?.displayName || 'Волонтёр',
        topic: room.topic,
        mood: room.mood,
      }
    };
  }

  /**
   * Auto-restore messages for a session's chat room securely
   */
  @Get('session/:sessionId/room/:roomId/messages')
  async getSessionMessages(
    @Param('sessionId') sessionId: string,
    @Param('roomId') roomId: string,
  ) {
    try {
      return await this.chatService.getMessagesForSession(sessionId, roomId);
    } catch (e) {
      throw new ForbiddenException(e.message);
    }
  }
}
