import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ChatModule } from '../chat/chat.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  providers: [TelegramService],
  imports: [ChatModule, AuthModule],
  exports: [TelegramService],
})
export class TelegramModule {}
