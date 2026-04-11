import { Telegraf, Markup, session, Context } from 'telegraf';
import { BOT_TOKEN, MONGODB_URI, ADMIN_ID } from './config';
import { connectDB } from './models/db';
import { createUser, getUserByTelegramId, getVolunteerByTelegramId, createVolunteer, removeVolunteer, updateLanguage } from './services/userService';
import { createConversation, getActiveConversationForUser, getActiveConversationForVolunteer, getPendingConversations, assignVolunteer, endConversation, getConversationById } from './services/conversationService';
import { saveMessage } from './services/messageService';
import { getStats } from './services/adminService';
import { createReview, updateReviewVolunteerSatisfaction, updateReviewUserScore } from './services/reviewService';
import { i18n } from './utils/i18n';

connectDB(MONGODB_URI);

interface SessionData {
  adminState?: 'WAITING_FOR_VOLUNTEER_ID' | 'WAITING_FOR_VOLUNTEER_REMOVE';
  userState?: 'WAITING_FOR_TOPIC';
}
interface MyContext extends Context {
  session?: SessionData;
}

const bot = new Telegraf<MyContext>(BOT_TOKEN);
bot.use(session());

async function sendWelcome(ctx: any, lang: string) {
  const t = i18n[lang] || i18n.en;
  await ctx.reply(
    t.welcome,
    Markup.inlineKeyboard([
      [Markup.button.callback(t.shareBtn, 'share')],
      [Markup.button.callback(t.aboutBtn, 'about'), Markup.button.callback(t.emergencyBtn, 'emergency')]
    ])
  );
}

bot.start(async (ctx) => {
  if (!ctx.from) return;
  const isSetupAdmin = ADMIN_ID !== undefined && ctx.from.id === ADMIN_ID;
  let user = await getUserByTelegramId(ctx.from.id);
  if (!user) {
    user = await createUser(ctx.from.id, isSetupAdmin);
  } else if (isSetupAdmin && !user.isAdmin) {
    user.isAdmin = true;
    await user.save();
  }

  await ctx.reply("Please select your language / Пожалуйста, выберите язык:",
    Markup.inlineKeyboard([
      Markup.button.callback("English 🇬🇧", 'setlang_en'),
      Markup.button.callback("Русский 🇷🇺", 'setlang_ru')
    ])
  );
});

bot.action(/setlang_(en|ru)/, async (ctx) => {
  if (!ctx.from) return;
  const lang = ctx.match[1];
  const user = await updateLanguage(ctx.from.id, lang);
  if (user) {
    await ctx.reply(i18n[lang].langChanged);
    await sendWelcome(ctx, lang);
  }
});

async function handleShareAction(ctx: any) {
  if (!ctx.from) return;
  const user = await getUserByTelegramId(ctx.from.id);
  if (!user) return ctx.reply(i18n.en.restartMsg);

  const lang = user.language || 'en';
  const t = i18n[lang];
  
  const activeConv = await getActiveConversationForUser(user._id);
  if (activeConv) return ctx.reply(t.activeConvMsg);

  ctx.session = ctx.session || {};
  ctx.session.userState = 'WAITING_FOR_TOPIC';
  await ctx.reply(t.enterTopic);
}

bot.action('share', handleShareAction);
bot.command('request', handleShareAction);

bot.command('admin', async (ctx) => {
  if (!ctx.from) return;
  const user = await getUserByTelegramId(ctx.from.id);
  if (!user || (!user.isAdmin && ctx.from.id !== ADMIN_ID)) return ctx.reply("Access denied.");

  await ctx.reply("🛡 Admin Panel:", Markup.inlineKeyboard([
    [Markup.button.callback("View Stats", 'admin_stats')],
    [Markup.button.callback("Add Volunteer", 'admin_add_volunteer'), Markup.button.callback("Remove Volunteer", 'admin_remove_volunteer')]
  ]));
});

bot.command('volunteer', async (ctx) => {
  if (!ctx.from) return;
  const volunteer = await getVolunteerByTelegramId(ctx.from.id);
  if (!volunteer) return ctx.reply("Access denied. You are not registered as a volunteer.");

  await ctx.reply("👨‍⚕️ Volunteer Dashboard:\n\nSelect an action below:", 
    Markup.inlineKeyboard([
      [Markup.button.callback("View Pending Requests", 'view_requests')],
      [Markup.button.callback("End Current Chat", 'vol_end_chat')]
    ])
  );
});

// Admin actions
bot.action('admin_stats', async (ctx) => {
  const stats = await getStats();
  await ctx.reply(`📊 System Stats:\nUsers: ${stats.usersCount}\nVolunteers: ${stats.volunteersCount}\nActive Chats: ${stats.activeConversations}\nPending Requests: ${stats.pendingConversations}\nTotal Messages: ${stats.totalMessages}`);
});
bot.action('admin_add_volunteer', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.adminState = 'WAITING_FOR_VOLUNTEER_ID';
  await ctx.reply("Please send the Telegram ID of the new volunteer:");
});
bot.action('admin_remove_volunteer', async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.adminState = 'WAITING_FOR_VOLUNTEER_REMOVE';
  await ctx.reply("Please send the Telegram ID of the volunteer to remove:");
});

// Volunteer actions
bot.action('view_requests', async (ctx) => {
  const requests = await getPendingConversations();
  if (requests.length === 0) return ctx.reply("📋 Нет новых заявок / No new requests at the moment.");

  let text = "📋 Pending Requests:\n\n";
  const buttons = [];
  for (let i = 0; i < requests.length; i++) {
     const r = requests[i];
     text += `${i+1}. Заявка / Request: "${r.topic}" [${r.anonymousId}]\n`;
     buttons.push([Markup.button.callback(`Принять / Accept #${i+1}`, `accept_${r._id}`)]);
  }
  await ctx.reply(text, Markup.inlineKeyboard(buttons));
});

bot.action(/accept_(.+)/, async (ctx) => {
  if (!ctx.from) return;
  const convId = ctx.match[1];
  await ctx.reply("Оцените сложность проблемы / Assess problem complexity:", Markup.inlineKeyboard([
    [Markup.button.callback("Легкая / Low", `complex_low_${convId}`)],
    [Markup.button.callback("Средняя / Medium", `complex_medium_${convId}`)],
    [Markup.button.callback("Сложная / High", `complex_high_${convId}`)]
  ]));
});

bot.action(/complex_(low|medium|high)_(.+)/, async (ctx) => {
  if (!ctx.from) return;
  const volunteer = await getVolunteerByTelegramId(ctx.from.id);
  if (!volunteer) return;

  const activeChat = await getActiveConversationForVolunteer(volunteer._id);
  if (activeChat) return ctx.reply("You already have an active chat.");

  const complexity = ctx.match[1];
  const convId = ctx.match[2];

  const conv = await assignVolunteer(convId, volunteer._id as unknown as string, complexity);
  if (conv) {
    await ctx.reply(`You have accepted conversation ${conv.anonymousId} (Complexity: ${complexity}).`);
    const userConv = await getConversationById(convId);
    if (userConv && (userConv as any).userId) {
       const uLang = (userConv as any).userId.language || 'en';
       await bot.telegram.sendMessage((userConv as any).userId.telegramId, i18n[uLang].volunteerJoined);
    }
  }
});

// --- END CHAT COMMAND ---
async function handleEndChat(ctx: any) {
  if (!ctx.from) return;

  // 1. Volunteer checks
  const volunteer = await getVolunteerByTelegramId(ctx.from.id);
  if (volunteer) {
    const activeChat = await getActiveConversationForVolunteer(volunteer._id);
    if (activeChat) {
      const vLang = 'ru'; // volunteer interface mainly EN/RU, we can default to EN or RU
      const t = i18n[vLang];
      const cid = activeChat._id;
      // Prompt satisfaction
      await ctx.reply(t.isSatisfiedPrompt, Markup.inlineKeyboard([
        [Markup.button.callback(t.satYes, `sat_yes_${cid}`)],
        [Markup.button.callback(t.satNo, `sat_no_${cid}`)]
      ]));
      return;
    }
  }

  // 2. User checks
  const user = await getUserByTelegramId(ctx.from.id);
  if (user) {
    const activeChat = await getActiveConversationForUser(user._id);
    if (activeChat) {
      const uLang = user.language || 'en';
      const t = i18n[uLang];
      const cid = activeChat._id;
      await ctx.reply(t.confirmEnd, Markup.inlineKeyboard([
        [Markup.button.callback(t.yesEnd, `endUser_yes_${cid}`)],
        [Markup.button.callback(t.noEnd, `endUser_no_${cid}`)]
      ]));
      return;
    }
  }

  await ctx.reply("You don't have an active chat to end.");
}

bot.command('end', handleEndChat);
bot.command('end_chat', handleEndChat);
bot.action('vol_end_chat', handleEndChat);

async function requestUserRating(telegramId: number, lang: string, convId: string) {
  const t = i18n[lang] || i18n.en;
  await bot.telegram.sendMessage(telegramId, t.ratePrompt, Markup.inlineKeyboard([
    [
      Markup.button.callback("1 ⭐️", `rate_1_${convId}`),
      Markup.button.callback("2 ⭐️", `rate_2_${convId}`),
      Markup.button.callback("3 ⭐️", `rate_3_${convId}`),
      Markup.button.callback("4 ⭐️", `rate_4_${convId}`),
      Markup.button.callback("5 ⭐️", `rate_5_${convId}`)
    ]
  ]));
}

// Volunteer Satisfaction Callback
bot.action(/sat_(yes|no)_(.+)/, async (ctx) => {
  const isSatisfied = ctx.match[1] === 'yes';
  const convId = ctx.match[2];

  // End chat
  const chat = await endConversation(convId);
  if (!chat) return;

  await createReview(chat.userId, chat.volunteerId, chat._id);
  await updateReviewVolunteerSatisfaction(chat._id, isSatisfied);

  await ctx.reply(i18n.ru.chatEndedVol); // Volunteer side feedback
  
  if ((chat as any).userId.telegramId) {
    const uLang = (chat as any).userId.language || 'en';
    await bot.telegram.sendMessage((chat as any).userId.telegramId, i18n[uLang].endChatClient);
    await requestUserRating((chat as any).userId.telegramId, uLang, chat._id as unknown as string);
  }
});

// User Ending Callback
bot.action(/endUser_(yes|no)_(.+)/, async (ctx) => {
  const isEnding = ctx.match[1] === 'yes';
  const convId = ctx.match[2];

  if (!isEnding) {
    await ctx.reply("Chat continues.");
    return;
  }

  const chat = await endConversation(convId);
  if (!chat) return;

  await createReview(chat.userId, chat.volunteerId, chat._id);
  
  const uLang = (chat as any).userId.language || 'en';
  await ctx.reply(i18n[uLang].chatEndedUser);
  await requestUserRating((chat as any).userId.telegramId, uLang, chat._id as unknown as string);

  if (chat.volunteerId && (chat as any).volunteerId.telegramId) {
    await bot.telegram.sendMessage((chat as any).volunteerId.telegramId, "The user has ended the chat.");
  }
});

// Rating Callback
bot.action(/rate_([1-5])_(.+)/, async (ctx) => {
  const score = parseInt(ctx.match[1]);
  const convId = ctx.match[2];

  await updateReviewUserScore(convId, score);

  if (ctx.from) {
    const user = await getUserByTelegramId(ctx.from.id);
    const lang = user?.language || 'en';
    await ctx.reply(i18n[lang].rateThanks);
  }
});

// Handle text messages
bot.on('text', async (ctx) => {
  if (!ctx.from) return;
  
  // 1. Admin setup states
  if (ctx.session?.adminState === 'WAITING_FOR_VOLUNTEER_ID') {
    const id = parseInt(ctx.message.text);
    if (!isNaN(id)) {
      await createVolunteer(id, `Vol_${id}`);
      await ctx.reply(`Volunteer ${id} added.`);
    } else {
      await ctx.reply("Invalid ID format.");
    }
    ctx.session.adminState = undefined;
    return;
  }

  if (ctx.session?.adminState === 'WAITING_FOR_VOLUNTEER_REMOVE') {
    const id = parseInt(ctx.message.text);
    if (!isNaN(id)) {
      await removeVolunteer(id);
      await ctx.reply(`Volunteer ${id} removed.`);
    } else {
      await ctx.reply("Invalid ID format.");
    }
    ctx.session.adminState = undefined;
    return;
  }

  const user = await getUserByTelegramId(ctx.from.id);
  const lang = user?.language || 'en';
  const t = i18n[lang] || i18n.en;

  // 2. User topic state
  if (ctx.session?.userState === 'WAITING_FOR_TOPIC') {
    if (!user) return;
    const topic = ctx.message.text;
    await createConversation(user._id, topic);
    ctx.session.userState = undefined;
    await ctx.reply(t.requestCreated);
    return;
  }

  // 3. Chat routing
  const text = ctx.message.text;

  // Check if volunteer
  const volunteer = await getVolunteerByTelegramId(ctx.from.id);
  if (volunteer) {
    const activeChat = await getActiveConversationForVolunteer(volunteer._id);
    if (activeChat) {
      await saveMessage(activeChat._id, 'volunteer', text);
      await bot.telegram.sendMessage((activeChat as any).userId.telegramId, text);
      return;
    }
  }

  // Check if user
  if (user) {
    const activeChat = await getActiveConversationForUser(user._id);
    if (activeChat) {
      await saveMessage(activeChat._id, 'user', text);
      if (activeChat.volunteerId && (activeChat as any).volunteerId.telegramId) {
        await bot.telegram.sendMessage((activeChat as any).volunteerId.telegramId, `[Anonymous]: ${text}`);
      }
      return;
    }
  }

  // If none, default reply
  await ctx.reply(t.defaultReply);
});

bot.launch().catch(err => console.error("Bot launch failed:", err));
console.log('🚀 Echo Bot launched');
