import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  providers: [TelegramService],
  imports: [ChatModule],
  exports: [TelegramService],
})
export class TelegramModule {}
