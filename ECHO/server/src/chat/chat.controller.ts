import { Controller, Get, Param, UseGuards } from '@nestjs/common';
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
}
