import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  InjectBot,
  Update,
  Start,
  Action,
  Command,
  On,
  Message,
  Ctx
} from 'nestjs-telegraf';
import { Context, Telegraf, Markup } from 'telegraf';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { ChatService } from '../chat/chat.service';
import { AuthService } from '../auth/auth.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { i18n } from './i18n';

// Session data stored in-memory per telegram user
interface UserSession {
  state?:
    | 'WAITING_FOR_TOPIC'
    | 'WAITING_FOR_VOLUNTEER_ID'
    | 'WAITING_FOR_VOLUNTEER_REMOVE';
  activeRoomId?: string;
}

@Update()
@Injectable()
export class TelegramService implements OnModuleInit {
  private botId: number;
  private sessions: Map<number, UserSession> = new Map();
  private adminTelegramId: number | null = null;
  private volunteerGroupId: string | null = null;

  constructor(
    @InjectBot() private bot: Telegraf<Context>,
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private chatService: ChatService,
    private authService: AuthService,
    private eventEmitter: EventEmitter2,
  ) {
    const adminIdEnv = process.env.ADMIN_TELEGRAM_ID;
    if (adminIdEnv) {
      this.adminTelegramId = parseInt(adminIdEnv, 10);
    }
    const groupEnv = process.env.VOLUNTEER_GROUP_ID;
    if (groupEnv) {
      // Clean quotes and spaces that might be present in environment variables
      let cleanId = groupEnv.trim().replace(/['"]/g, '');
      // Ensure it starts with - if it looks like a group ID but lacks the minus
      if (cleanId && !cleanId.startsWith('-') && cleanId.length > 5) {
          cleanId = '-' + cleanId;
      }
      this.volunteerGroupId = cleanId;
    }
    console.log(`[TELEGRAM] Admin ID: ${this.adminTelegramId}`);
    console.log(`[TELEGRAM] Volunteer Group ID: ${this.volunteerGroupId}`);
  }

  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async onModuleInit() {
    // Initialize bot in background to not block the server port binding
    if (!this.bot) {
        console.error('❌ [TELEGRAM] Bot instance is NOT available. Initialization aborted.');
        return;
    }

    this.bot.telegram.getMe()
      .then(me => {
        this.botId = me.id;
        console.log(`🤖 [TELEGRAM] Bot [@${me.username}] is ONLINE and ready.`);
        
        // Launch bot polling in background with retry logic for Railway overlapping deploys
        const startBot = async () => {
          let retries = 10;
          while (retries > 0) {
            try {
              await this.bot.launch({ dropPendingUpdates: true });
              break; // Successfully connected
            } catch (err: any) {
              if (err?.response?.error_code === 409 || err?.error_code === 409 || err?.message?.includes('409')) {
                console.warn(`⚠️ Telegram 409 Conflict (Overlap Deploy). Retrying... (${retries} left)`);
                await new Promise(r => setTimeout(r, 5000));
                retries--;
              } else {
                console.error('❌ [TELEGRAM] Bot launch failed:', err);
                break;
              }
            }
          }
        };
        startBot();
      })
      .catch(err => {
        console.error('❌ [TELEGRAM] Bot failed to connect to Telegram API!');
        console.error(`Reason: ${err.message || err}`);
      });
  }

  private getSession(tgId: number): UserSession {
    if (!this.sessions.has(tgId)) {
      this.sessions.set(tgId, {});
    }
    return this.sessions.get(tgId)!;
  }

  private getLang(language?: string): string {
    return language && i18n[language] ? language : 'ru';
  }

  private t(lang: string): Record<string, string> {
    return i18n[lang] || i18n.ru;
  }

  // ─────────────────────────────────────────────
  // START — universal entry point
  // ─────────────────────────────────────────────
  @Start()
  async onStart(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;

    // Language selection first
    await ctx.reply(
      'Please select your language / Пожалуйста, выберите язык:',
      Markup.inlineKeyboard([
        Markup.button.callback('English 🇬🇧', 'setlang_en'),
        Markup.button.callback('Русский 🇷🇺', 'setlang_ru'),
      ]),
    );
  }

  @Action(/setlang_(en|ru)/)
  async onSetLang(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;
    const ctxMatch = ctx as { match?: RegExpMatchArray };
    const lang = ctxMatch.match?.[1] || 'ru';

    // Ensure BotUser exists securely
    let botUser = await this.prisma.botUser.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
    });

    const isSystemAdmin = this.adminTelegramId !== null && tgUser.id === this.adminTelegramId;

    if (!botUser) {
      botUser = await this.prisma.botUser.create({
        data: {
          telegramId: BigInt(tgUser.id),
          language: lang,
          isAdmin: isSystemAdmin,
        },
      });
    } else {
      botUser = await this.prisma.botUser.update({
        where: { telegramId: BigInt(tgUser.id) },
        data: { 
          language: lang,
          isAdmin: isSystemAdmin || botUser.isAdmin, 
        },
      });
    }

    const t = this.t(lang);
    await ctx.reply(t.langChanged);

    // Check if volunteer
    const volunteer = await this.prisma.volunteer.findFirst({
      where: { telegramId: BigInt(tgUser.id), isVerified: true },
    });

    if (volunteer) {
      // Volunteer welcome
      const statusText = volunteer.isOnline ? '🟢 ОНЛАЙН (Online)' : '🔴 ОФФЛАЙН (Offline)';
      await ctx.reply(
        `${t.volWelcome}\n\n🆔 ${volunteer.displayName}\nСтатус: ${statusText}\n\nДля переключения статуса используйте /online и /offline.\nДля просмотра активных чатов введите /chats.`,
        Markup.inlineKeyboard([
          [Markup.button.callback(t.viewRequests, 'view_requests')],
          [Markup.button.callback('🗂 Активные чаты', 'vol_view_chats')],
        ]),
      );
      return;
    }

    // Regular user welcome
    await ctx.reply(
      t.welcome,
      Markup.inlineKeyboard([
        [Markup.button.callback(t.shareBtn, 'share')],
        [
          Markup.button.callback(t.aboutBtn, 'about'),
          Markup.button.callback(t.emergencyBtn, 'emergency'),
        ],
      ]),
    );
  }

  // ─────────────────────────────────────────────
  // USER ACTIONS (teens)
  // ─────────────────────────────────────────────
  @Action('share')
  async onShare(ctx: Context) {
    await this.handleShareAction(ctx);
  }

  @Command('request')
  async onRequestCommand(ctx: Context) {
    await this.handleShareAction(ctx);
  }

  private async handleShareAction(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;

    const botUser = await this.prisma.botUser.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
    });
    if (!botUser) {
      return ctx.reply(i18n.ru.restartMsg);
    }

    const lang = this.getLang(botUser.language);
    const t = this.t(lang);

    // Check active chat
    const activeRoom = await this.prisma.chatRoom.findFirst({
      where: { botUserId: botUser.id, status: { in: ['waiting', 'active'] } },
    });
    if (activeRoom) {
      return ctx.reply(t.activeConvMsg);
    }

    const session = this.getSession(tgUser.id);
    session.state = 'WAITING_FOR_TOPIC';
    await ctx.reply(t.enterTopic);
  }

  @Action('about')
  async onAbout(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;
    const botUser = await this.prisma.botUser.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
    });
    const lang = this.getLang(botUser?.language);
    await ctx.reply(this.t(lang).aboutText);
  }

  @Action('emergency')
  async onEmergency(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;
    const botUser = await this.prisma.botUser.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
    });
    const lang = this.getLang(botUser?.language);
    await ctx.reply(this.t(lang).emergencyText);
  }

  // ─────────────────────────────────────────────
  // ADMIN ACTIONS
  // ─────────────────────────────────────────────
  @Command('admin')
  async onAdminCommand(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;

    const botUser = await this.prisma.botUser.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
    });

    const isAdmin =
      botUser?.isAdmin ||
      (this.adminTelegramId !== null && tgUser.id === this.adminTelegramId);
    if (!isAdmin) return ctx.reply('Access denied.');

    const lang = this.getLang(botUser?.language);
    const t = this.t(lang);

    await ctx.reply(
      t.adminPanel,
      Markup.inlineKeyboard([
        [Markup.button.callback(t.viewStats, 'admin_stats')],
        [
          Markup.button.callback(t.addVolunteer, 'admin_add_volunteer'),
          Markup.button.callback(t.removeVolunteer, 'admin_remove_volunteer'),
        ],
      ]),
    );
  }

  @Action('admin_stats')
  async onAdminStats(ctx: Context) {
    const stats = await this.chatService.getStats();
    const botUsers = await this.prisma.botUser.count();
    await ctx.reply(
      `📊 System Stats:\n` +
        `Users (Bot): ${botUsers}\n` +
        `Volunteers: ${stats.totalVolunteers}\n` +
        `Active Chats: ${stats.activeRooms}\n` +
        `In Queue: ${stats.queueLength}\n` +
        `Total Rooms: ${stats.totalRooms}\n` +
        `Total Messages: ${stats.totalMessages}`,
    );
  }

  @Action('admin_add_volunteer')
  async onAdminAddVolunteer(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;
    const session = this.getSession(tgUser.id);
    session.state = 'WAITING_FOR_VOLUNTEER_ID';
    const botUser = await this.prisma.botUser.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
    });
    const lang = this.getLang(botUser?.language);
    await ctx.reply(this.t(lang).sendVolunteerId);
  }

  @Action('admin_remove_volunteer')
  async onAdminRemoveVolunteer(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;
    const session = this.getSession(tgUser.id);
    session.state = 'WAITING_FOR_VOLUNTEER_REMOVE';
    const botUser = await this.prisma.botUser.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
    });
    const lang = this.getLang(botUser?.language);
    await ctx.reply(this.t(lang).sendVolunteerRemoveId);
  }

  // ─────────────────────────────────────────────
  // VOLUNTEER ACTIONS  
  // ─────────────────────────────────────────────
  @Command('volunteer')
  async onVolunteerCommand(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;

    const volunteer = await this.prisma.volunteer.findFirst({
      where: { telegramId: BigInt(tgUser.id), isVerified: true },
    });
    if (!volunteer) return ctx.reply('Access denied. Not registered as volunteer.');

    const botUser = await this.prisma.botUser.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
    });
    const lang = this.getLang(botUser?.language);
    const t = this.t(lang);

    const statusText = volunteer.isOnline ? '🟢 ОНЛАЙН' : '🔴 ОФФЛАЙН';

    await ctx.reply(
      `${t.volDashboard}\nСтатус: ${statusText}\n/online | /offline | /chats`,
      Markup.inlineKeyboard([
        [Markup.button.callback(t.viewRequests, 'view_requests')],
        [Markup.button.callback('🗂 Активные чаты', 'vol_view_chats')],
      ]),
    );
  }

  @Command('online')
  async onOnlineCommand(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;

    const volunteer = await this.prisma.volunteer.findFirst({
      where: { telegramId: BigInt(tgUser.id), isVerified: true },
    });
    if (!volunteer) return ctx.reply('Access denied.');

    await this.prisma.volunteer.update({
      where: { id: volunteer.id },
      data: { isOnline: true },
    });
    return ctx.reply('🟢 Вы вошли в систему (Онлайн). Теперь вы будете получать новые заявки.');
  }

  @Command('offline')
  async onOfflineCommand(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;

    const volunteer = await this.prisma.volunteer.findFirst({
      where: { telegramId: BigInt(tgUser.id), isVerified: true },
    });
    if (!volunteer) return ctx.reply('Access denied.');

    await this.prisma.volunteer.update({
      where: { id: volunteer.id },
      data: { isOnline: false },
    });
    return ctx.reply('🔴 Вы покинули систему (Оффлайн). Приятного отдыха.');
  }

  @Action('view_requests')
  async onViewRequests(ctx: Context) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: { status: 'waiting' },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    if (rooms.length === 0) {
      return ctx.reply('📋 Нет новых заявок / No new requests.');
    }

    let text = '📋 Pending Requests / Заявки:\n\n';
    const buttons: any[] = [];
    rooms.forEach((r, i) => {
      const src = r.source === 'telegram' ? '📱' : '🌐';
      text += `${i + 1}. ${src} "${r.topic}" [${r.anonNickname}]\n`;
      buttons.push([
        Markup.button.callback(
          `✅ Принять / Accept #${i + 1}`,
          `accept_chat:${r.id}`,
        ),
      ]);
    });

    await ctx.reply(text, Markup.inlineKeyboard(buttons));
  }

  // ─────────────────────────────────────────────
  // ACCEPT CHAT + COMPLEXITY
  // ─────────────────────────────────────────────
  @Action(/accept_chat:(.+)/)
  async onAcceptChat(ctx: Context) {
    const ctxMatch = ctx as { match?: RegExpMatchArray };
    const roomId = ctxMatch.match?.[1];
    if (!roomId) return;
    const tgUser = ctx.from;
    if (!tgUser) return;

    const volunteer = await this.prisma.volunteer.findFirst({
      where: { telegramId: BigInt(tgUser.id) },
    });

    if (!volunteer || !volunteer.isVerified) {
      if (ctx.callbackQuery) {
        return ctx.answerCbQuery('⛔️ Вы не авторизованы или не подтверждены.', { show_alert: true });
      }
      return ctx.reply('⛔️ Вы не авторизованы или не подтверждены.');
    }

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room || room.status !== 'waiting') {
      if (ctx.callbackQuery) {
        return ctx.answerCbQuery('⚠️ Этот чат уже принят другим волонтёром или закрыт.', { show_alert: true });
      }
      return ctx.reply('⚠️ Этот чат уже принят другим волонтёром или закрыт.');
    }

    // Ask for complexity assessment
    await ctx.reply(
      'Оцените сложность проблемы / Assess complexity:',
      Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Легкая / Low', `complex_low_${roomId}`)],
        [Markup.button.callback('🟡 Средняя / Medium', `complex_medium_${roomId}`)],
        [Markup.button.callback('🔴 Сложная / High', `complex_high_${roomId}`)],
      ]),
    );
  }

  @Action(/complex_(low|medium|high)_(.+)/)
  async onComplexitySet(ctx: Context) {
    const ctxMatch = ctx as { match?: RegExpMatchArray };
    const complexity = ctxMatch.match?.[1];
    const roomId = ctxMatch.match?.[2];
    if (!complexity || !roomId) return;
    const tgUser = ctx.from;
    if (!tgUser) return;

    const volunteer = await this.prisma.volunteer.findFirst({
      where: { telegramId: BigInt(tgUser.id) },
    });
    if (!volunteer) return;

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });
    if (!room || room.status !== 'waiting') {
      return ctx.reply('⚠️ Чат уже занят или закрыт.');
    }

    // Accept and set complexity
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        volunteerId: volunteer.id,
        status: 'active',
        complexity,
      },
    });

    // Remove from queue
    this.chatService.removeFromQueue(roomId);

    // Set as active focus in session
    const session = this.getSession(tgUser.id);
    session.activeRoomId = roomId;

    // Notify web clients via EventEmitter
    this.eventEmitter.emit('telegram.chat_accepted', {
      roomId,
      volunteerName: volunteer.displayName,
    });

    // We send a direct message, avoiding modifying group messages
    await this.bot.telegram.sendMessage(
      tgUser.id,
      `💬 Чат начат с ${room.anonNickname}\n` +
        `Тема: ${room.topic}\n` +
        `Сложность: ${complexity}\n\n` +
        `Теперь этот чат в ФОКУСЕ. Все сообщения будут переданы подростку.\n` +
        `Используйте /chats чтобы переключаться между пользователями.`
    );

    if (ctx.callbackQuery) {
        await ctx.answerCbQuery('Чат принят!');
        try {
            await ctx.editMessageText(`✅ Вы приняли чат (Сложность: ${complexity}).`);
        } catch(e) { } // Ignore if from group where bot isn't admin to edit
    }

    // Notify the teen in TG if source is telegram
    if (room.source === 'telegram' && room.botUserId) {
      const botUser = await this.prisma.botUser.findUnique({
        where: { id: room.botUserId },
      });
      if (botUser) {
        const uLang = this.getLang(botUser.language);
        await this.bot.telegram.sendMessage(
          Number(botUser.telegramId),
          this.t(uLang).volunteerJoined,
        );
      }
    }
  }

  // ─────────────────────────────────────────────
  // MULTIPLEXING AND CHAT SELECTION
  // ─────────────────────────────────────────────
  @Command('chats')
  async onChatsCommand(ctx: Context) {
    await this.showActiveChats(ctx);
  }

  @Action('vol_view_chats')
  async onVolViewChats(ctx: Context) {
    await this.showActiveChats(ctx);
  }

  private async showActiveChats(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;
    const volunteer = await this.prisma.volunteer.findFirst({
        where: { telegramId: BigInt(tgUser.id), isVerified: true },
    });
    if (!volunteer) return;

    const activeRooms = await this.prisma.chatRoom.findMany({
        where: { volunteerId: volunteer.id, status: 'active' },
        orderBy: { createdAt: 'desc' }
    });

    if (activeRooms.length === 0) {
        return ctx.reply('У вас нет активных чатов.');
    }

    const session = this.getSession(tgUser.id);
    let text = 'Ваши активные чаты (нажмите для переключения):\n';
    
    const buttons: any[] = [];
    activeRooms.forEach((r, i) => {
        const isFocused = session.activeRoomId === r.id;
        const icon = isFocused ? '🎯' : '👤';
        text += `${isFocused ? '**' : ''}${i + 1}. [${r.anonNickname}] - ${r.topic}${isFocused ? '** (Фокус)' : ''}\n`;
        buttons.push([
            Markup.button.callback(`${icon} Общаться с ${r.anonNickname}`, `focus_${r.id}`)
        ]);
        buttons.push([
            Markup.button.callback(`🔴 Завершить чат с ${r.anonNickname}`, `vol_end_chat_${r.id}`)
        ]);
    });

    await ctx.reply(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
  }

  @Action(/focus_(.+)/)
  async onFocusChanged(ctx: Context) {
    const ctxMatch = ctx as { match?: RegExpMatchArray };
    const roomId = ctxMatch.match?.[1];
    if (!roomId) return;
    const tgUser = ctx.from;
    if (!tgUser) return;

    const session = this.getSession(tgUser.id);
    session.activeRoomId = roomId;

    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId }});
    if (!room) return;

    await ctx.reply(`🎯 Фокус переключен на: ${room.anonNickname}\nТеперь ваши текстовые сообщения отправляются ему.\n/chats - вернуться к списку.\n/end - завершить чат.`);
  }

  // ─────────────────────────────────────────────
  // END CHAT
  // ─────────────────────────────────────────────
  @Command('end')
  async onEndCommand(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;
    const session = this.getSession(tgUser.id);
    await this.handleEndChat(ctx, session.activeRoomId);
  }

  @Action(/vol_end_chat_(.+)/)
  async onVolEndChatSpecific(ctx: Context) {
     const ctxMatch = ctx as { match?: RegExpMatchArray };
     const roomId = ctxMatch.match?.[1];
     await this.handleEndChat(ctx, roomId);
  }

  private async handleEndChat(ctx: Context, requestedRoomId?: string) {
    const tgUser = ctx.from;
    if (!tgUser) return;

    // 1. Check volunteer
    const volunteer = await this.prisma.volunteer.findFirst({
      where: { telegramId: BigInt(tgUser.id) },
    });

    if (volunteer) {
      let activeRoom: any = null;
      if (requestedRoomId) {
         activeRoom = await this.prisma.chatRoom.findFirst({
             where: { id: requestedRoomId, volunteerId: volunteer.id, status: 'active' }
         });
      } else {
         const activeRooms = await this.prisma.chatRoom.findMany({
             where: { volunteerId: volunteer.id, status: 'active' }
         });
         
         if (activeRooms.length === 1) {
             activeRoom = activeRooms[0];
         } else if (activeRooms.length > 1) {
             return ctx.reply('У вас несколько активных чатов. Пожалуйста, используйте /chats и нажмите "Завершить" под конкретным чатом.');
         }
      }

      if (activeRoom) {
        // Clear focus if this was the focused room
        const session = this.getSession(tgUser.id);
        if (session.activeRoomId === activeRoom.id) {
           session.activeRoomId = undefined;
        }

        // Ask satisfaction
        await ctx.reply(
          'Доволен ли пользователь оказанной помощью?',
          Markup.inlineKeyboard([
            [Markup.button.callback('✅ Да / Yes', `sat_yes_${activeRoom.id}`)],
            [Markup.button.callback('❌ Нет / No', `sat_no_${activeRoom.id}`)],
          ]),
        );
        return;
      }
    }

    // 2. Check user
    const botUser = await this.prisma.botUser.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
    });

    if (botUser) {
      const activeRoom = await this.prisma.chatRoom.findFirst({
        where: { botUserId: botUser.id, status: 'active' },
      });

      if (activeRoom) {
        const lang = this.getLang(botUser.language);
        const t = this.t(lang);
        await ctx.reply(
          t.confirmEnd,
          Markup.inlineKeyboard([
            [Markup.button.callback(t.yesEnd, `endUser_yes_${activeRoom.id}`)],
            [Markup.button.callback(t.noEnd, `endUser_no_${activeRoom.id}`)],
          ]),
        );
        return;
      }
    }

    await ctx.reply('No active chat / Нет активного чата.');
  }

  // Volunteer satisfaction
  @Action(/sat_(yes|no)_(.+)/)
  async onSatisfaction(ctx: Context) {
    const ctxMatch = ctx as { match?: RegExpMatchArray };
    const isSatisfied = ctxMatch.match?.[1] === 'yes';
    const roomId = ctxMatch.match?.[2];
    if (!roomId) return;

    // Close room
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { status: 'closed', closedAt: new Date() },
    });

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { volunteer: true },
    });

    // Create review
    if (room?.volunteerId) {
      await this.prisma.review.upsert({
        where: { chatRoomId: roomId },
        update: { isSatisfied },
        create: {
          chatRoomId: roomId,
          volunteerId: room.volunteerId,
          isSatisfied,
        },
      });
    }

    this.eventEmitter.emit('telegram.chat_closed', { roomId });
    await ctx.reply('✅ Чат завершён / Chat ended.');

    // Notify teenager
    if (room?.botUserId) {
      const botUser = await this.prisma.botUser.findUnique({
        where: { id: room.botUserId },
      });
      if (botUser) {
        const uLang = this.getLang(botUser.language);
        const t = this.t(uLang);
        await this.bot.telegram.sendMessage(
          Number(botUser.telegramId),
          t.endChatClient,
        );
        // Ask for rating
        await this.requestUserRating(Number(botUser.telegramId), uLang, roomId);
      }
    }
  }

  // User ending
  @Action(/endUser_(yes|no)_(.+)/)
  async onUserEnd(ctx: Context) {
    const ctxMatch = ctx as { match?: RegExpMatchArray };
    const isEnding = ctxMatch.match?.[1] === 'yes';
    const roomId = ctxMatch.match?.[2];
    if (!roomId) return;

    if (!isEnding) {
      return ctx.reply('Chat continues / Чат продолжается.');
    }

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { volunteer: true },
    });

    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { status: 'closed', closedAt: new Date() },
    });

    if (room?.volunteerId) {
      await this.prisma.review.upsert({
        where: { chatRoomId: roomId },
        update: {},
        create: {
          chatRoomId: roomId,
          volunteerId: room.volunteerId,
        },
      });
    }

    this.eventEmitter.emit('telegram.chat_closed', { roomId });

    const tgUser = ctx.from;
    if (tgUser) {
      const botUser = await this.prisma.botUser.findUnique({
        where: { telegramId: BigInt(tgUser.id) },
      });
      const uLang = this.getLang(botUser?.language);
      const t = this.t(uLang);
      await ctx.reply(t.chatEndedUser);
      await this.requestUserRating(tgUser.id, uLang, roomId);
    }

    // Notify volunteer
    if (room?.volunteer?.telegramId) {
      await this.bot.telegram.sendMessage(
        Number(room.volunteer.telegramId),
        'The user has ended the chat / Пользователь завершил чат.',
      );
    }
  }

  // Rating
  private async requestUserRating(
    telegramId: number,
    lang: string,
    roomId: string,
  ) {
    const t = this.t(lang);
    await this.bot.telegram.sendMessage(
      telegramId,
      t.ratePrompt,
      Markup.inlineKeyboard([
        [
          Markup.button.callback('1 ⭐', `rate_1_${roomId}`),
          Markup.button.callback('2 ⭐', `rate_2_${roomId}`),
          Markup.button.callback('3 ⭐', `rate_3_${roomId}`),
          Markup.button.callback('4 ⭐', `rate_4_${roomId}`),
          Markup.button.callback('5 ⭐', `rate_5_${roomId}`),
        ],
      ]),
    );
  }

  @Action(/rate_([1-5])_(.+)/)
  async onRate(ctx: Context) {
    const ctxMatch = ctx as { match?: RegExpMatchArray };
    const score = parseInt(ctxMatch.match?.[1] || '0', 10);
    const roomId = ctxMatch.match?.[2];
    if (!roomId || !score) return;

    await this.prisma.review.updateMany({
      where: { chatRoomId: roomId },
      data: { score },
    });

    const tgUser = ctx.from;
    if (tgUser) {
      const botUser = await this.prisma.botUser.findUnique({
        where: { telegramId: BigInt(tgUser.id) },
      });
      const lang = this.getLang(botUser?.language);
      await ctx.reply(this.t(lang).rateThanks);
    }
  }

  // ─────────────────────────────────────────────
  // TEXT MESSAGE HANDLER (routing)
  // ─────────────────────────────────────────────
  @On('text')
  async onMessage(@Message('text') text: string, @Ctx() ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;

    // Skip commands
    if (text.startsWith('/')) return;

    const session = this.getSession(tgUser.id);

    // ── Admin: add volunteer ──
    if (session.state === 'WAITING_FOR_VOLUNTEER_ID') {
      session.state = undefined;
      const id = parseInt(text, 10);
      if (isNaN(id)) return ctx.reply('Invalid ID / Неверный ID.');

      // Check if volunteer with this TG ID already exists
      const existing = await this.prisma.volunteer.findFirst({
        where: { telegramId: BigInt(id) },
      });
      if (existing) {
        return ctx.reply(`Volunteer with TG ID ${id} already exists.`);
      }

      await this.prisma.volunteer.create({
        data: {
          username: `vol_${id}`,
          passwordHash: 'tg_managed',
          displayName: `Volunteer ${id}`,
          telegramId: BigInt(id),
          isVerified: true,
        },
      });
      return ctx.reply(`✅ Volunteer ${id} added / Волонтёр ${id} добавлен.`);
    }

    // ── Admin: remove volunteer ──
    if (session.state === 'WAITING_FOR_VOLUNTEER_REMOVE') {
      session.state = undefined;
      const id = parseInt(text, 10);
      if (isNaN(id)) return ctx.reply('Invalid ID / Неверный ID.');

      await this.prisma.volunteer.deleteMany({
        where: { telegramId: BigInt(id) },
      });
      return ctx.reply(`✅ Volunteer ${id} removed / Волонтёр ${id} удалён.`);
    }

    // ── User: entering topic ──
    if (session.state === 'WAITING_FOR_TOPIC') {
      session.state = undefined;

      const botUser = await this.prisma.botUser.findUnique({
        where: { telegramId: BigInt(tgUser.id) },
      });
      if (!botUser) return ctx.reply('Please /start first.');

      const lang = this.getLang(botUser.language);
      const t = this.t(lang);

      // Create room from bot
      const room = await this.chatService.createRoomFromBot(
        `anon_${Math.random().toString(36).slice(2, 8)}`,
        'neutral',
        text,
        `tg_${tgUser.id}`,
        botUser.id,
      );

      await ctx.reply(t.requestCreated);
      return;
    }

    // ── Route messages in active chat ──

    // Check if volunteer
    const volunteer = await this.prisma.volunteer.findFirst({
      where: { telegramId: BigInt(tgUser.id) },
    });

    if (volunteer) {
      // Find active room based on focus or default to the only active room
      let activeRoomId = session.activeRoomId;
      
      const allActiveRooms = await this.prisma.chatRoom.findMany({
        where: { volunteerId: volunteer.id, status: 'active' }
      });

      if (allActiveRooms.length === 0) {
          return ctx.reply('У вас нет активных чатов. Дождитесь заявки или используйте /online.');
      }

      if (!activeRoomId && allActiveRooms.length === 1) {
          activeRoomId = allActiveRooms[0].id;
          session.activeRoomId = activeRoomId;
      } else if (!activeRoomId && allActiveRooms.length > 1) {
          return ctx.reply('У вас несколько активных чатов. Пожалуйста, выберите фокус в /chats.');
      }

      const activeRoom = allActiveRooms.find(r => r.id === activeRoomId);

      if (activeRoom) {
        // Save and forward to teen
        await this.chatService.saveMessage(activeRoom.id, text, 'volunteer');

        this.eventEmitter.emit('telegram.message', {
          roomId: activeRoom.id,
          content: text,
          senderType: 'volunteer',
        });

        // If teen is on TG, forward directly
        if (activeRoom.source === 'telegram' && activeRoom.botUserId) {
          const botUser = await this.prisma.botUser.findUnique({
            where: { id: activeRoom.botUserId },
          });
          if (botUser) {
            await this.bot.telegram.sendMessage(
              Number(botUser.telegramId),
              text,
            );
          }
        }
        return;
      }
    }

    // Check if user in active chat
    const botUser = await this.prisma.botUser.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
    });

    if (botUser) {
      const activeRoom = await this.prisma.chatRoom.findFirst({
        where: { botUserId: botUser.id, status: 'active' },
        include: { volunteer: true },
      });

      if (activeRoom) {
        // Save message as anon
        await this.chatService.saveMessage(activeRoom.id, text, 'anon');

        // Forward to volunteer TG
        if (activeRoom.volunteer?.telegramId) {
          await this.bot.telegram.sendMessage(
            Number(activeRoom.volunteer.telegramId),
            `[Anonymous]: ${text}`,
          );
        }

        // Also emit for web clients
        this.eventEmitter.emit('telegram.message', {
          roomId: activeRoom.id,
          content: text,
          senderType: 'anon',
        });
        return;
      }

      // Check waiting
      const waitingRoom = await this.prisma.chatRoom.findFirst({
        where: { botUserId: botUser.id, status: 'waiting' },
      });
      if (waitingRoom) {
        const lang = this.getLang(botUser.language);
        await ctx.reply(
          '⏳ Ваш запрос в очереди. Волонтёр скоро подключится.\nYour request is in the queue. A volunteer will join soon.',
        );
        return;
      }
    }

    // Default reply
    const lang = this.getLang(botUser?.language);
    await ctx.reply(this.t(lang).defaultReply);
  }

  // ─────────────────────────────────────────────
  // EVENT BRIDGES (Web ↔ Telegram)
  // ─────────────────────────────────────────────

  /**
   * Notify TG volunteers when new room created (from web or bot)
   */
  @OnEvent('room.created')
  async handleRoomCreated(room: {
    id: string;
    anonNickname: string;
    mood: string;
    topic: string;
    source?: string;
  }) {
    console.log(`[TELEGRAM] Event room.created received. Source: ${room.source}, ID: ${room.id}`);
    const srcIcon = room.source === 'telegram' ? '📱' : '🌐';
    const message =
      `<b>🔔 Новый запрос на чат!</b> ${srcIcon}\n\n` +
      `<b>👤 Ник:</b> ${this.escapeHTML(room.anonNickname)}\n` +
      `<b>🎭 Настроение:</b> ${this.escapeHTML(room.mood)}\n` +
      `<b>💬 Тема:</b> ${this.escapeHTML(room.topic)}\n\n` +
      `Нажми кнопку ниже, чтобы принять.`;

    const markup = Markup.inlineKeyboard([
      Markup.button.callback('✅ Принять чат', `accept_chat:${room.id}`),
    ]);

    // If VOLUNTEER_GROUP_ID is set, just spam the group instead of everyone in PM
    if (this.volunteerGroupId) {
       console.log(`[TELEGRAM] Attempting to notify group: ${this.volunteerGroupId}`);
       try {
           await this.bot.telegram.sendMessage(this.volunteerGroupId, message, {
             parse_mode: 'HTML',
             ...markup,
           });
           console.log(`[TELEGRAM] Group notification sent.`);
           return;
       } catch (err) {
           console.error(`[TELEGRAM] Failed to send to group ${this.volunteerGroupId}:`, err.message);
       }
    }

    // Fallback: Notify online verified volunteers directly
    const volunteers = await this.prisma.volunteer.findMany({
      where: {
        telegramId: { not: null },
        isVerified: true,
        isOnline: true,
      },
    });

    for (const v of volunteers) {
      try {
        await this.bot.telegram.sendMessage(Number(v.telegramId), message, {
          parse_mode: 'HTML',
          ...markup,
        });
      } catch (err) {
        console.error(`[TELEGRAM] Failed to notify volunteer ${v.username}:`, err.message);
      }
    }
  }

  /**
   * Forward web anon messages to TG volunteer
   */
  @OnEvent('message.from_anon')
  async handleMessageFromAnon(payload: {
    chatRoomId: string;
    content: string;
  }) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: payload.chatRoomId },
      include: { volunteer: true },
    });

    if (room?.volunteer?.telegramId) {
      try {
        await this.bot.telegram.sendMessage(
          Number(room.volunteer.telegramId),
          `[Web User]: ${payload.content}`,
        );
      } catch (err) {
        console.error('Failed to forward message to TG volunteer:', err);
      }
    }
  }

  /**
   * Forward web anon messages to TG volunteer (explicit event)
   */
  @OnEvent('message.to_telegram')
  async handleMessageToTelegram(payload: {
    roomId: string;
    content: string;
  }) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: payload.roomId },
      include: { volunteer: true },
    });

    if (room?.volunteer?.telegramId) {
      await this.bot.telegram.sendMessage(
        Number(room.volunteer.telegramId),
        payload.content,
      );
    }
  }

  // ─────────────────────────────────────────────
  // ACCOUNT LINKING — /password & /id
  // ─────────────────────────────────────────────

  /**
   * /password <nickname> <password>
   * Creates or updates the user's web login credentials.
   * After this, they can log into the web app using their nickname + password.
   */
  @Command('password')
  async onSetPassword(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;

    const botUser = await this.prisma.botUser.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
    });
    const lang = this.getLang(botUser?.language);

    // Parse args from message text
    const msgText = (ctx.message as any)?.text || '';
    const parts = msgText.trim().split(/\s+/);
    // parts[0] = '/password', parts[1] = nickname, parts[2] = password

    if (parts.length < 3) {
      return ctx.reply(
        lang === 'en'
          ? '⚠️ Usage: /password <nickname> <password>\nExample: /password MyCoolNick mySecret123'
          : '⚠️ Использование: /password <никнейм> <пароль>\nПример: /password МойНик мойПароль123',
      );
    }

    const nickname = parts[1];
    const password = parts[2];

    if (password.length < 6) {
      return ctx.reply(
        lang === 'en'
          ? '⚠️ Password must be at least 6 characters long.'
          : '⚠️ Пароль должен быть не менее 6 символов.',
      );
    }

    try {
      await this.authService.linkTelegramToUser(BigInt(tgUser.id), nickname, password);
      await ctx.reply(
        lang === 'en'
          ? `✅ Your web account has been set up!\n\n🔑 Nickname: ${nickname}\nYou can now log in to the Echo web platform using this nickname and password.`
          : `✅ Ваш веб-аккаунт настроен!\n\n🔑 Никнейм: ${nickname}\nТеперь вы можете войти на сайт Echo с этим никнеймом и паролем.`,
      );
    } catch (err: any) {
      await ctx.reply(
        lang === 'en'
          ? `❌ Error: ${err.message || 'Could not set password. Please try a different nickname.'}`
          : `❌ Ошибка: ${err.message || 'Не удалось установить пароль. Попробуйте другой никнейм.'}`,
      );
    }
  }

  /**
   * /id — Shows the user their linked web account info.
   */
  @Command('id')
  async onShowId(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;

    const botUser = await this.prisma.botUser.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
    });
    const lang = this.getLang(botUser?.language);

    const linkedUser = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
    });

    if (!linkedUser) {
      return ctx.reply(
        lang === 'en'
          ? '🔗 You have no web account linked yet.\nUse /password <nickname> <password> to create one.'
          : '🔗 У вас пока нет привязанного веб-аккаунта.\nИспользуйте /password <никнейм> <пароль> для создания.',
      );
    }

    const specialIdLine = linkedUser.specialId
      ? (lang === 'en' ? `🆔 Special ID: ${linkedUser.specialId}` : `🆔 Специальный ID: ${linkedUser.specialId}`)
      : (lang === 'en' ? '🆔 Special ID: (not yet assigned by admin)' : '🆔 Специальный ID: (ещё не назначен администратором)');

    await ctx.reply(
      lang === 'en'
        ? `🌐 Your Web Account:\n\n👤 Nickname: ${linkedUser.nickname}\n${specialIdLine}\n✅ Approved: ${linkedUser.isApproved ? 'Yes' : 'No'}\n\nGo to the Echo website and log in with your nickname and the password you set.`
        : `🌐 Ваш веб-аккаунт:\n\n👤 Никнейм: ${linkedUser.nickname}\n${specialIdLine}\n✅ Подтверждён: ${linkedUser.isApproved ? 'Да' : 'Нет'}\n\nПерейдите на сайт Echo и войдите с вашим никнеймом и паролем.`,
    );
  }

  // ─────────────────────────────────────────────
  // VOLUNTEER APPROVAL FLOW
  // ─────────────────────────────────────────────

  @OnEvent('volunteer.registered')
  async handleVolunteerRegistration(payload: any) {
    const { username, displayName, firstName, lastName, phone, telegramId } = payload;
    
    const message = `
✨ <b>Новая регистрация волонтёра!</b>

👤 <b>ФИО:</b> ${this.escapeHTML(lastName || '-')} ${this.escapeHTML(firstName || '-')}
📝 <b>Никнейм:</b> ${this.escapeHTML(username)}
🏷️ <b>Отображаемое имя:</b> ${this.escapeHTML(displayName)}
📞 <b>Телефон:</b> <code>${this.escapeHTML(phone || '-')}</code>
🆔 <b>TG ID:</b> <code>${telegramId || '-'}</code>
${telegramId ? `🔗 <a href="tg://user?id=${telegramId}">Открыть профиль</a>` : ''}

✅ Чтобы подтвердить: <code>/v_approve ${username}</code>
❌ Чтобы отклонить: <code>/v_reject ${username}</code>
    `.trim();

    if (this.adminTelegramId) {
      await this.bot.telegram.sendMessage(this.adminTelegramId, message, { parse_mode: 'HTML' });
    }
    if (this.volunteerGroupId) {
      await this.bot.telegram.sendMessage(this.volunteerGroupId, message, { parse_mode: 'HTML' });
    }
  }

  @Command('v_pending')
  async listPendingVolunteers(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;

    // Check if user is admin
    const botUser = await this.prisma.botUser.findUnique({ where: { telegramId: BigInt(tgUser.id) } });
    if (!botUser?.isAdmin && tgUser.id !== this.adminTelegramId) return;

    const pending = await this.prisma.volunteer.findMany({
      where: { isVerified: false },
      orderBy: { createdAt: 'desc' },
    });

    if (pending.length === 0) {
      return ctx.reply('✨ Нет волонтёров, ожидающих подтверждения.');
    }

    let report = '⏳ <b>Ожидают подтверждения:</b>\n\n';
    pending.forEach((v, i) => {
      report += `${i + 1}. <b>${this.escapeHTML(v.username)}</b> (${this.escapeHTML(v.lastName || '')} ${this.escapeHTML(v.firstName || '')})\n`;
      report += `   — <code>/v_approve ${v.username}</code>\n\n`;
    });

    await ctx.reply(report, { parse_mode: 'HTML' });
  }

  @Command('v_approve')
  async approveVolunteer(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;
    const msgText = (ctx.message as any)?.text || '';
    const parts = msgText.trim().split(/\s+/);
    
    if (parts.length < 2) {
      return ctx.reply('⚠️ Использование: /v_approve <username>');
    }

    const username = parts[1];

    // Check if user is admin
    const botUser = await this.prisma.botUser.findUnique({ where: { telegramId: BigInt(tgUser.id) } });
    if (!botUser?.isAdmin && tgUser.id !== this.adminTelegramId) return;

    try {
      const updated = await this.prisma.volunteer.update({
        where: { username },
        data: { isVerified: true },
      });
      await ctx.reply(`✅ Волонтёр <b>${this.escapeHTML(updated.username)}</b> успешно подтверждён!`, { parse_mode: 'HTML' });
    } catch (err) {
      await ctx.reply(`❌ Ошибка: Волонтёр "${username}" не найден.`);
    }
  }

  @Command('v_reject')
  async rejectVolunteer(ctx: Context) {
    const tgUser = ctx.from;
    if (!tgUser) return;
    const msgText = (ctx.message as any)?.text || '';
    const parts = msgText.trim().split(/\s+/);
    
    if (parts.length < 2) {
      return ctx.reply('⚠️ Использование: /v_reject <username>');
    }

    const username = parts[1];

    // Check if user is admin
    const botUser = await this.prisma.botUser.findUnique({ where: { telegramId: BigInt(tgUser.id) } });
    if (!botUser?.isAdmin && tgUser.id !== this.adminTelegramId) return;

    try {
      await this.prisma.volunteer.delete({ where: { username } });
      await ctx.reply(`🗑️ Регистрация волонтёра <b>${this.escapeHTML(username)}</b> была отклонена и удалена.`, { parse_mode: 'HTML' });
    } catch (err) {
      await ctx.reply(`❌ Ошибка: Волонтёр "${username}" не найден.`);
    }
  }
}
