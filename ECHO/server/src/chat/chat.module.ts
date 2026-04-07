import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { CleanupService } from './cleanup.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, CleanupService],
  exports: [ChatService],
})
export class ChatModule {}
