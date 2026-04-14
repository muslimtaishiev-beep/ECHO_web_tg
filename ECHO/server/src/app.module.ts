import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TelegrafModule } from 'nestjs-telegraf';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { TelegramModule } from './telegram/telegram.module';
import { AdminModule } from './admin/admin.module';

const validToken = [process.env.TELEGRAM_BOT_TOKEN, process.env.BOT_TOKEN].find(
  (t) => t && t !== '1234567890:test_token_dummy_xyz123'
);

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100 }],
    }),
    EventEmitterModule.forRoot(),
    ...(validToken
      ? [
          TelegrafModule.forRoot({
            token: validToken,
            launchOptions: false,
          }),
          TelegramModule,
        ]
      : (() => {
          console.warn(
            '⚠️ [TELEGRAM] Bot is DISABLED. Token is missing or placeholder.',
          );
          return [];
        })()),
    PrismaModule,
    CommonModule,
    AuthModule,
    ChatModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
