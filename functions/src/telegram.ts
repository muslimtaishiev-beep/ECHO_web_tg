import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Telegraf, Markup, Context } from 'telegraf';
import { randomBytes } from 'crypto';
import { encryptRoom, decryptRoom } from './crypto';

// admin.initializeApp() runs in admin.ts, imported first by index.ts.
const db = admin.firestore();

// If no token is configured, use an inert placeholder so the functions
// runtime loads cleanly. The bot simply won't answer until a real token is
// set and the webhook is registered via /setupWebhook.
const token =
  process.env.TELEGRAM_BOT_TOKEN || '0000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const bot = new Telegraf(token);

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn('⚠️ [TELEGRAM] Bot is DISABLED — TELEGRAM_BOT_TOKEN is not set.');
}

const VOLUNTEER_GROUP_ID = process.env.VOLUNTEER_GROUP_ID || '';

const i18n: Record<string, Record<string, string>> = {
  ru: {
    chooseLang: 'Выберите язык / Choose your language:',
    welcome: '👋 Добро пожаловать в ECHO — анонимная эмоциональная поддержка.',
    share: 'Поделиться проблемой',
    about: 'О проекте',
    emergency: 'Экстренная помощь',
    enterTopic: '📝 Опишите в двух словах вашу проблему (тему):',
    requestCreated: '💬 Заявка создана! Волонтёр скоро подключится. Пишите сюда, мы передадим.',
    volunteerJoined: '🟢 Волонтёр подключился к чату!',
    chatEnded: '🔴 Чат завершён. Спасибо, что обратились в ECHO.',
    defaultReply: 'Нажмите «Поделиться проблемой», чтобы начать.',
    accepted: '✅ Чат принят! Пишите сообщения — они будут доставлены анонимно.',
    noActive: 'У вас нет активного чата.',
  },
  en: {
    chooseLang: 'Choose your language / Выберите язык:',
    welcome: '👋 Welcome to ECHO — anonymous emotional support.',
    share: "Share what's on your mind",
    about: 'About this project',
    emergency: 'Emergency help',
    enterTopic: '📝 Briefly describe your problem (topic):',
    requestCreated: '💬 Request created! A volunteer will join shortly. Write here and we will deliver it.',
    volunteerJoined: '🟢 A volunteer has joined the chat!',
    chatEnded: '🔴 Chat ended. Thank you for using ECHO.',
    defaultReply: 'Tap "Share what\'s on your mind" to start.',
    accepted: '✅ Chat accepted! Write messages and they will be delivered anonymously.',
    noActive: 'You have no active chat.',
  },
};

function roomKey(): string {
  return randomBytes(32).toString('base64');
}

async function getUserLang(tgId: number): Promise<string> {
  const snap = await db.collection('botUsers').doc(String(tgId)).get();
  return (snap.exists ? snap.get('language') : 'ru') || 'ru';
}

async function t(ctx: Context, key: string): Promise<string> {
  const tgId = ctx.from?.id;
  const lang = tgId ? await getUserLang(tgId) : 'ru';
  return (i18n[lang] || i18n.ru)[key] || key;
}

// ── /start ────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  if (!ctx.from) return;
  await db.collection('botUsers').doc(String(ctx.from.id)).set(
    { telegramId: String(ctx.from.id), createdAt: new Date() },
    { merge: true },
  );
  await ctx.reply(
    i18n.ru.chooseLang,
    Markup.inlineKeyboard([
      [Markup.button.callback('English 🇬🇧', 'setlang_en'), Markup.button.callback('Русский 🇷🇺', 'setlang_ru')],
    ]),
  );
});

// ── language selection ────────────────────────────────────────────
bot.action(/setlang_(en|ru)/, async (ctx) => {
  if (!ctx.from) return;
  const chosen = ctx.match[1];
  await db.collection('botUsers').doc(String(ctx.from.id)).set(
    { language: chosen },
    { merge: true },
  );
  const w = (i18n[chosen] || i18n.ru);
  await ctx.reply(
    w.welcome,
    Markup.inlineKeyboard([
      [Markup.button.callback(w.share, 'share')],
      [Markup.button.callback(w.about, 'about'), Markup.button.callback(w.emergency, 'emergency')],
    ]),
  );
});

// ── request flow ──────────────────────────────────────────────────
async function startRequest(ctx: Context) {
  if (!ctx.from) return;
  await db.collection('botUsers').doc(String(ctx.from.id)).set(
    { state: 'WAITING_FOR_TOPIC' },
    { merge: true },
  );
  await ctx.reply(await t(ctx, 'enterTopic'));
}

bot.action('share', (ctx) => startRequest(ctx));
bot.command('request', (ctx) => startRequest(ctx));

bot.action('about', async (ctx) => {
  await ctx.reply('ECHO — анонимная поддержка подростков. 🔒 AES-256-GCM · 🛡 Полная анонимность · 🗑 Авто-удаление.');
});
bot.action('emergency', async (ctx) => {
  await ctx.reply('🆘 Россия: 8-800-2000-122 · Казахстан: 150 · Международная: befrienders.org/need-to-talk');
});

// ── volunteer accepts a room ──────────────────────────────────────
bot.action(/accept_(.+)/, async (ctx) => {
  if (!ctx.from) return;
  const roomId = ctx.match[1];
  const volSnap = await db.collection('volunteers').where('telegramId', '==', String(ctx.from.id)).get();
  if (volSnap.empty) {
    await ctx.answerCbQuery('You are not registered as a volunteer.');
    return;
  }
  const vol = volSnap.docs[0];
  const roomRef = db.collection('chatRooms').doc(roomId);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists || roomSnap.get('status') !== 'waiting') {
    await ctx.answerCbQuery('This chat is already taken.');
    return;
  }
  await roomRef.update({ volunteerId: vol.id, status: 'active' });
  await db.collection('volunteers').doc(vol.id).update({ activeRoomId: roomId });

  const userTgId = roomSnap.get('botUserId');
  if (userTgId) {
    await bot.telegram.sendMessage(userTgId, await t(ctx, 'volunteerJoined'));
  }
  await ctx.reply(await t(ctx, 'accepted'));
  await ctx.answerCbQuery();
});

// ── /end ──────────────────────────────────────────────────────────
bot.command('end', async (ctx) => {
  if (!ctx.from) return;
  const tgId = ctx.from.id;
  const userDoc = await db.collection('botUsers').doc(String(tgId)).get();
  const roomId = userDoc.exists ? userDoc.get('activeRoomId') : null;
  if (roomId) {
    await db.collection('chatRooms').doc(roomId).update({ status: 'closed', closedAt: new Date() });
    await db.collection('botUsers').doc(String(tgId)).set({ activeRoomId: null }, { merge: true });
    await ctx.reply(await t(ctx, 'chatEnded'));
  } else {
    await ctx.reply(await t(ctx, 'noActive'));
  }
});

// ── text message routing ──────────────────────────────────────────
bot.on('text', async (ctx) => {
  if (!ctx.from || !ctx.message || !('text' in ctx.message)) return;
  const tgId = ctx.from.id;
  const text = ctx.message.text;

  const userDoc = await db.collection('botUsers').doc(String(tgId)).get();
  const state = userDoc.exists ? userDoc.get('state') : null;

  // 1. Teenager is answering the topic prompt → create a room.
  if (state === 'WAITING_FOR_TOPIC') {
    await db.collection('botUsers').doc(String(tgId)).set({ state: null }, { merge: true });
    const roomRef = await db.collection('chatRooms').add({
      anonNickname: ctx.from.first_name || 'Anon',
      mood: 'neutral',
      topic: text,
      status: 'waiting',
      source: 'telegram',
      botUserId: String(tgId),
      encryptionKey: roomKey(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection('botUsers').doc(String(tgId)).set({ activeRoomId: roomRef.id }, { merge: true });
    await ctx.reply(await t(ctx, 'requestCreated'));

    if (VOLUNTEER_GROUP_ID) {
      await bot.telegram.sendMessage(
        VOLUNTEER_GROUP_ID,
        `📥 New request\n🧑 ${ctx.from.first_name || 'Anon'}\n📝 ${text}`,
        Markup.inlineKeyboard([[Markup.button.callback('Accept', `accept_${roomRef.id}`)]]),
      );
    }
    return;
  }

  // 2. Volunteer with an active room → relay to the teenager.
  const volQuery = await db.collection('volunteers').where('telegramId', '==', String(tgId)).get();
  if (!volQuery.empty) {
    const vol = volQuery.docs[0];
    const activeRoomId = vol.get('activeRoomId');
    if (activeRoomId) {
      const roomSnap = await db.collection('chatRooms').doc(activeRoomId).get();
      if (roomSnap.exists && roomSnap.get('status') === 'active') {
        const key = roomSnap.get('encryptionKey');
        const { content, iv } = encryptRoom(text, key);
        await db.collection('chatRooms').doc(activeRoomId).collection('messages').add({
          content,
          iv,
          senderType: 'volunteer',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const userTgId = roomSnap.get('botUserId');
        if (userTgId) await bot.telegram.sendMessage(userTgId, text);
        return;
      }
    }
  }

  // 3. Teenager with an active room → relay to the volunteer.
  const activeRoomId = userDoc.exists ? userDoc.get('activeRoomId') : null;
  if (activeRoomId) {
    const roomSnap = await db.collection('chatRooms').doc(activeRoomId).get();
    if (roomSnap.exists && roomSnap.get('status') === 'active') {
      const key = roomSnap.get('encryptionKey');
      const { content, iv } = encryptRoom(text, key);
      await db.collection('chatRooms').doc(activeRoomId).collection('messages').add({
        content,
        iv,
        senderType: 'anon',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      const volId = roomSnap.get('volunteerId');
      if (volId) {
        const vSnap = await db.collection('volunteers').doc(volId).get();
        const volTgId = vSnap.get('telegramId');
        if (volTgId) await bot.telegram.sendMessage(volTgId, `[Anonymous]: ${text}`);
      }
      return;
    }
  }

  await ctx.reply(await t(ctx, 'defaultReply'));
});

// ── HTTP webhook entry points ─────────────────────────────────────
export const telegramWebhook = functions.https.onRequest(async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
    if (!res.headersSent) res.status(200).end();
  } catch (err) {
    console.error('Telegram webhook error:', err);
    if (!res.headersSent) res.status(500).end();
  }
});

/** One-off: register the bot webhook URL after deployment. */
export const setupWebhook = functions.https.onRequest(async (req, res) => {
  const url = process.env.TELEGRAM_WEBHOOK_URL;
  if (!url) {
    res.status(400).json({ error: 'TELEGRAM_WEBHOOK_URL is not set.' });
    return;
  }
  await bot.telegram.setWebhook(url);
  res.status(200).json({ ok: true, url });
});

