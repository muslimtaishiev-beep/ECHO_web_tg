import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Telegraf, Markup, Context } from 'telegraf';
import { randomBytes } from 'crypto';
import { encryptRoom } from './crypto';

// admin.initializeApp() runs in admin.ts, imported first by index.ts.
const db = admin.firestore();
const auth = admin.auth();

// Inert placeholder so the runtime loads cleanly without a token.
const token =
  process.env.TELEGRAM_BOT_TOKEN || '0000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const bot = new Telegraf(token);
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn('⚠️ [TELEGRAM] Bot is DISABLED — TELEGRAM_BOT_TOKEN is not set.');
}

const VOLUNTEER_GROUP_ID = process.env.VOLUNTEER_GROUP_ID || '';
const ADMIN_TELEGRAM_ID = parseInt(process.env.ADMIN_TELEGRAM_ID || '0', 10);

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
    chatAlreadyTaken: '⚠️ Этот чат уже принят другим волонтёром или закрыт.',
    assessComplexity: 'Оцените сложность проблемы:',
    complexityLow: '🟢 Лёгкая',
    complexityMedium: '🟡 Средняя',
    complexityHigh: '🔴 Сложная',
    ratePrompt: 'Пожалуйста, оцените помощь волонтёра от 1 до 5:',
    rateThanks: '✨ Спасибо! Ваша оценка сохранена.',
    satPrompt: 'Пользователь доволен оказанной помощью?',
    satYes: 'Да, доволен',
    satNo: 'Нет, требуется помощь',
    satRecorded: 'Спасибо, записано.',
    passwordUsage: '⚠️ Использование: /password <никнейм> <пароль>',
    passwordOk: '✅ Веб-аккаунт настроен! Никнейм: {nickname}. Войдите на сайт с этим никнеймом и паролем.',
    passwordError: '❌ Ошибка: {error}',
    noWebAccount: '🔗 У вас нет привязанного веб-аккаунта. Используйте /password <никнейм> <пароль>.',
    idInfo: '🌐 Ваш аккаунт:\n👤 Никнейм: {nickname}\n🆔 ID: {specialId}\n✅ Одобрен: {approved}',
    adminPanel: '🛡 Панель администратора:',
    viewStats: 'Статистика',
    addVolunteer: 'Добавить волонтёра',
    removeVolunteer: 'Удалить волонтёра',
    sendVolunteerId: 'Отправьте Telegram ID нового волонтёра:',
    sendVolunteerRemoveId: 'Отправьте Telegram ID волонтёра для удаления:',
    volunteerAdded: 'Волонтёр добавлен.',
    volunteerRemoved: 'Волонтёр удалён.',
    invalidId: 'Неверный формат ID.',
    accessDenied: 'Доступ запрещён.',
    end: 'Завершить чат',
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
    chatAlreadyTaken: '⚠️ This chat was already accepted or closed.',
    assessComplexity: 'Assess problem complexity:',
    complexityLow: '🟢 Low',
    complexityMedium: '🟡 Medium',
    complexityHigh: '🔴 High',
    ratePrompt: 'Please rate the volunteer\'s help from 1 to 5:',
    rateThanks: '✨ Thank you! Your rating has been recorded.',
    satPrompt: 'Is the user satisfied with the help?',
    satYes: 'Yes, satisfied',
    satNo: 'No, needs more help',
    satRecorded: 'Thank you, recorded.',
    passwordUsage: '⚠️ Usage: /password <nickname> <password>',
    passwordOk: '✅ Web account ready! Nickname: {nickname}. Log in to the site with this nickname and password.',
    passwordError: '❌ Error: {error}',
    noWebAccount: '🔗 You have no linked web account. Use /password <nickname> <password>.',
    idInfo: '🌐 Your account:\n👤 Nickname: {nickname}\n🆔 ID: {specialId}\n✅ Approved: {approved}',
    adminPanel: '🛡 Admin panel:',
    viewStats: 'Statistics',
    addVolunteer: 'Add volunteer',
    removeVolunteer: 'Remove volunteer',
    sendVolunteerId: 'Send the Telegram ID of the new volunteer:',
    sendVolunteerRemoveId: 'Send the Telegram ID of the volunteer to remove:',
    volunteerAdded: 'Volunteer added.',
    volunteerRemoved: 'Volunteer removed.',
    invalidId: 'Invalid ID format.',
    accessDenied: 'Access denied.',
    end: 'End chat',
  },
};

function roomKey(): string {
  return randomBytes(32).toString('base64');
}

function syntheticEmail(nickname: string): string {
  const clean = nickname.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `${clean}@echo.user`;
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

async function isAdmin(tgId: number): Promise<boolean> {
  if (ADMIN_TELEGRAM_ID && tgId === ADMIN_TELEGRAM_ID) return true;
  const snap = await db.collection('botUsers').doc(String(tgId)).get();
  return snap.exists && snap.get('isAdmin') === true;
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
  await db.collection('botUsers').doc(String(ctx.from.id)).set({ language: chosen }, { merge: true });
  const w = i18n[chosen] || i18n.ru;
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
  await db.collection('botUsers').doc(String(ctx.from.id)).set({ state: 'WAITING_FOR_TOPIC' }, { merge: true });
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
    await ctx.answerCbQuery(await t(ctx, 'chatAlreadyTaken'));
    return;
  }
  await roomRef.update({ volunteerId: vol.id, status: 'active' });
  await db.collection('volunteers').doc(vol.id).update({ activeRoomId: roomId });

  const userTgId = roomSnap.get('botUserId');
  if (userTgId) {
    await bot.telegram.sendMessage(userTgId, await t(ctx, 'volunteerJoined'));
  }
  await ctx.reply(await t(ctx, 'accepted'));
  await ctx.reply(
    await t(ctx, 'assessComplexity'),
    Markup.inlineKeyboard([
      [
        Markup.button.callback(await t(ctx, 'complexityLow'), `complexity_${roomId}_low`),
        Markup.button.callback(await t(ctx, 'complexityMedium'), `complexity_${roomId}_medium`),
        Markup.button.callback(await t(ctx, 'complexityHigh'), `complexity_${roomId}_high`),
      ],
    ]),
  );
  await ctx.answerCbQuery();
});

// ── complexity assessment ─────────────────────────────────────────
bot.action(/complexity_(.+)_(low|medium|high)/, async (ctx) => {
  if (!ctx.from) return;
  await db.collection('chatRooms').doc(ctx.match[1]).update({ complexity: ctx.match[2] });
  await ctx.answerCbQuery('Сложность сохранена');
});

// ── /password <nickname> <password> (link Telegram → web) ─────────
bot.command('password', async (ctx) => {
  if (!ctx.from) return;
  const text = (ctx.message as any)?.text || '';
  const parts = text.trim().split(/\s+/);
  if (parts.length < 3) return ctx.reply(await t(ctx, 'passwordUsage'));
  const nickname = parts[1];
  const password = parts[2];
  if (password.length < 6) return ctx.reply(await t(ctx, 'passwordUsage'));
  try {
    const email = syntheticEmail(nickname);
    let uid: string;
    try {
      uid = (await auth.getUserByEmail(email)).uid;
    } catch {
      uid = (await auth.createUser({ email, password, emailVerified: true })).uid;
    }
    await db.collection('users').doc(uid).set(
      { nickname, email, telegramId: String(ctx.from.id), isApproved: true, specialId: null },
      { merge: true },
    );
    await ctx.reply((await t(ctx, 'passwordOk')).replace('{nickname}', nickname));
  } catch (err: any) {
    await ctx.reply((await t(ctx, 'passwordError')).replace('{error}', err.message || ''));
  }
});

// ── /id (show linked web account) ─────────────────────────────────
bot.command('id', async (ctx) => {
  if (!ctx.from) return;
  const q = await db.collection('users').where('telegramId', '==', String(ctx.from.id)).get();
  if (q.empty) return ctx.reply(await t(ctx, 'noWebAccount'));
  const u = q.docs[0].data();
  await ctx.reply(
    (await t(ctx, 'idInfo'))
      .replace('{nickname}', u.nickname || '-')
      .replace('{specialId}', u.specialId || '(ещё не назначен)')
      .replace('{approved}', u.isApproved ? 'Да' : 'Нет'),
  );
});

// ── /admin panel ──────────────────────────────────────────────────
bot.command('admin', async (ctx) => {
  if (!ctx.from) return;
  if (!(await isAdmin(ctx.from.id))) return ctx.reply(await t(ctx, 'accessDenied'));
  await ctx.reply(
    await t(ctx, 'adminPanel'),
    Markup.inlineKeyboard([
      [Markup.button.callback(await t(ctx, 'viewStats'), 'admin_stats')],
      [
        Markup.button.callback(await t(ctx, 'addVolunteer'), 'admin_add_volunteer'),
        Markup.button.callback(await t(ctx, 'removeVolunteer'), 'admin_remove_volunteer'),
      ],
    ]),
  );
});

bot.action('admin_stats', async (ctx) => {
  if (!ctx.from || !(await isAdmin(ctx.from.id))) return ctx.answerCbQuery();
  const [vols, rooms] = await Promise.all([
    db.collection('volunteers').get(),
    db.collection('chatRooms').get(),
  ]);
  let active = 0;
  rooms.docs.forEach((d) => { if (d.data().status === 'active') active++; });
  await ctx.reply(`📊 Волонтёров: ${vols.size}\n💬 Чатов: ${rooms.size}\n🟢 Активных: ${active}`);
  await ctx.answerCbQuery();
});

bot.action('admin_add_volunteer', async (ctx) => {
  if (!ctx.from || !(await isAdmin(ctx.from.id))) return ctx.answerCbQuery();
  await db.collection('botUsers').doc(String(ctx.from.id)).set({ state: 'WAITING_FOR_VOLUNTEER_ID' }, { merge: true });
  await ctx.reply(await t(ctx, 'sendVolunteerId'));
  await ctx.answerCbQuery();
});

bot.action('admin_remove_volunteer', async (ctx) => {
  if (!ctx.from || !(await isAdmin(ctx.from.id))) return ctx.answerCbQuery();
  await db.collection('botUsers').doc(String(ctx.from.id)).set({ state: 'WAITING_FOR_VOLUNTEER_REMOVE' }, { merge: true });
  await ctx.reply(await t(ctx, 'sendVolunteerRemoveId'));
  await ctx.answerCbQuery();
});

// ── /end (close chat + rating flow) ───────────────────────────────
bot.command('end', async (ctx) => {
  if (!ctx.from) return;
  const tgId = ctx.from.id;
  const userDoc = await db.collection('botUsers').doc(String(tgId)).get();
  const roomId = userDoc.exists ? userDoc.get('activeRoomId') : null;
  if (!roomId) return ctx.reply(await t(ctx, 'noActive'));

  const roomSnap = await db.collection('chatRooms').doc(roomId).get();
  await db.collection('chatRooms').doc(roomId).update({ status: 'closed', closedAt: new Date() });
  await db.collection('botUsers').doc(String(tgId)).set({ activeRoomId: null }, { merge: true });

  const volId = roomSnap.get('volunteerId');
  if (volId) {
    const vSnap = await db.collection('volunteers').doc(volId).get();
    const volTgId = vSnap.get('telegramId');
    if (volTgId) {
      await bot.telegram.sendMessage(volTgId, 'Пользователь завершил чат.');
      await bot.telegram.sendMessage(
        volTgId,
        await t(ctx, 'satPrompt'),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(await t(ctx, 'satYes'), `sat_yes_${roomId}`),
            Markup.button.callback(await t(ctx, 'satNo'), `sat_no_${roomId}`),
          ],
        ]),
      );
    }
    await db.collection('volunteers').doc(volId).update({ activeRoomId: null });
  }

  await ctx.reply(await t(ctx, 'chatEnded'));
  await ctx.reply(
    await t(ctx, 'ratePrompt'),
    Markup.inlineKeyboard([
      [1, 2, 3, 4, 5].map((n) => Markup.button.callback(String(n), `rate_${n}_${roomId}`)),
    ]),
  );
});

// ── rating callbacks ──────────────────────────────────────────────
bot.action(/rate_([1-5])_(.+)/, async (ctx) => {
  const score = parseInt(ctx.match[1], 10);
  const roomId = ctx.match[2];
  const roomSnap = await db.collection('chatRooms').doc(roomId).get();
  await db.collection('reviews').doc(roomId).set(
    { chatRoomId: roomId, volunteerId: roomSnap.get('volunteerId') || '', score, createdAt: new Date() },
    { merge: true },
  );
  await ctx.answerCbQuery(await t(ctx, 'rateThanks'));
  await ctx.reply(await t(ctx, 'rateThanks'));
});

bot.action(/sat_(yes|no)_(.+)/, async (ctx) => {
  const satisfied = ctx.match[1] === 'yes';
  const roomId = ctx.match[2];
  await db.collection('reviews').doc(roomId).set({ isSatisfied: satisfied }, { merge: true });
  await ctx.answerCbQuery(await t(ctx, 'satRecorded'));
});

// ── text message routing ──────────────────────────────────────────
bot.on('text', async (ctx) => {
  if (!ctx.from || !ctx.message || !('text' in ctx.message)) return;
  const tgId = ctx.from.id;
  const text = ctx.message.text;

  const userDoc = await db.collection('botUsers').doc(String(tgId)).get();
  const state = userDoc.exists ? userDoc.get('state') : null;

  // 1. Admin: awaiting volunteer ID to ADD.
  if (state === 'WAITING_FOR_VOLUNTEER_ID') {
    const id = parseInt(text, 10);
    if (isNaN(id)) return ctx.reply(await t(ctx, 'invalidId'));
    await db.collection('volunteers').doc(`tg_${id}`).set({
      telegramId: String(id), isVerified: true, displayName: `Vol_${id}`, createdAt: new Date(),
    });
    await db.collection('botUsers').doc(String(tgId)).set({ state: null }, { merge: true });
    return ctx.reply(await t(ctx, 'volunteerAdded'));
  }

  // 2. Admin: awaiting volunteer ID to REMOVE.
  if (state === 'WAITING_FOR_VOLUNTEER_REMOVE') {
    const id = parseInt(text, 10);
    if (isNaN(id)) return ctx.reply(await t(ctx, 'invalidId'));
    const q = await db.collection('volunteers').where('telegramId', '==', String(id)).get();
    const batch = db.batch();
    q.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    await db.collection('botUsers').doc(String(tgId)).set({ state: null }, { merge: true });
    return ctx.reply(await t(ctx, 'volunteerRemoved'));
  }

  // 3. Teenager answering the topic prompt → create a room.
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

  // 4. Volunteer with an active room → relay to the teenager.
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
          content, iv, senderType: 'volunteer', createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const userTgId = roomSnap.get('botUserId');
        if (userTgId) await bot.telegram.sendMessage(userTgId, text);
        return;
      }
    }
  }

  // 5. Teenager with an active room → relay to the volunteer.
  const activeRoomId = userDoc.exists ? userDoc.get('activeRoomId') : null;
  if (activeRoomId) {
    const roomSnap = await db.collection('chatRooms').doc(activeRoomId).get();
    if (roomSnap.exists && roomSnap.get('status') === 'active') {
      const key = roomSnap.get('encryptionKey');
      const { content, iv } = encryptRoom(text, key);
      await db.collection('chatRooms').doc(activeRoomId).collection('messages').add({
        content, iv, senderType: 'anon', createdAt: admin.firestore.FieldValue.serverTimestamp(),
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




