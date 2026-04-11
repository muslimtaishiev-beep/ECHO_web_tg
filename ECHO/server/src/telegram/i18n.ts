export const i18n: Record<string, Record<string, string>> = {
  en: {
    welcome:
      '👋 Welcome to ECHO — Your Anonymous Emotional Support Platform.\n\n' +
      'We connect you with trained volunteers while keeping your identity private.\n\n' +
      '🛡 By using this bot, you agree to our:\n' +
      '- [User Agreement](https://docs.google.com/document/d/1r7usEg9XNfyELW2BmISFkgqpX0uCkBnFDeBVEDBDQ7I/edit?usp=sharing)\n' +
      '- [Privacy Policy](https://docs.google.com/document/d/1r7usEg9XNfyELW2BmISFkgqpX0uCkBnFDeBVEDBDQ7I/edit?usp=sharing)',
    shareBtn: "Share what's on your mind",
    aboutBtn: 'About this project',
    emergencyBtn: 'Emergency Help Resources',
    restartMsg: 'Please restart the bot with /start',
    activeConvMsg:
      'You already have an active conversation. You can type your messages below or type /end to finish.',
    enterTopic:
      "📝 Please enter a short topic or title for your request (e.g. 'Work Stress', 'Loneliness'):",
    requestCreated:
      '💬 A request has been created! A volunteer will join shortly. You can start typing your message below and we will deliver it.',
    langChanged: 'Language changed to English 🇬🇧',
    accessDenied: 'Access denied.',
    noRequests: '📋 No new requests at the moment.',
    topicPrompt: 'Topic: ',
    volunteerJoined:
      '🟢 A volunteer has joined the chat! You can now talk anonymously. To stop the chat, type /end.',
    endChatClient:
      '🔴 The volunteer has ended the chat. Thank you for using ECHO.',
    defaultReply:
      "To start talking, type /request or click 'Share what's on your mind'",
    confirmEnd:
      'Are you sure you want to end this chat? The project takes no further responsibility after.',
    yesEnd: 'Yes, End Chat',
    noEnd: 'No, Continue',
    chatEndedUser: 'You have ended the chat.',
    ratePrompt: "Please rate the volunteer's help from 1 to 5 stars:",
    rateThanks: '✨ Thank you! Your rating has been recorded.',
    isSatisfiedPrompt: 'Is the user satisfied with the provided help?',
    satYes: 'Yes, Satisfied',
    satNo: 'No, Needs more help',
    chatEndedVol: 'You have successfully closed the requested chat.',
    aboutText:
      'ECHO is an anonymous emotional support platform where teenagers can get help from trained volunteers through encrypted real-time chat.\n\n' +
      '🔒 Full anonymity — no personal data\n' +
      '🛡 AES-256-GCM encryption\n' +
      '🗑 Auto-deletion in 24 hours\n' +
      '⚡ Real-time delivery via WebSocket',
    emergencyText:
      '🆘 Emergency Help Resources:\n\n' +
      '🇷🇺 Russia: 8-800-2000-122 (free, 24/7)\n' +
      '🇰🇿 Kazakhstan: 150 (confidential)\n' +
      '🌍 International: befrienders.org/need-to-talk\n\n' +
      '⚠️ If you are in immediate danger, please call local emergency services.',
    complexityLow: '🟢 Low',
    complexityMedium: '🟡 Medium',
    complexityHigh: '🔴 High',
    assessComplexity: 'Assess problem complexity:',
    volWelcome:
      '👋 Welcome back, volunteer!\n\nI will send new chat requests here. Press "Accept" to start a conversation.',
    noActiveChat: "You don't have an active chat.",
    waitNewRequest: 'No active chat right now. Wait for a new request.',
    chatAccepted: '✅ Chat accepted! Messages you write here will be forwarded.',
    chatAlreadyTaken: '⚠️ This chat was already accepted by another volunteer or closed.',
    chatClosedOk: '✅ Chat successfully ended.',
    volDashboard: '👨‍⚕️ Volunteer Dashboard:\n\nSelect an action below:',
    viewRequests: 'View Pending Requests',
    endCurrentChat: 'End Current Chat',
    adminPanel: '🛡 Admin Panel:',
    viewStats: 'View Stats',
    addVolunteer: 'Add Volunteer',
    removeVolunteer: 'Remove Volunteer',
    sendVolunteerId: 'Please send the Telegram ID of the new volunteer:',
    sendVolunteerRemoveId: 'Please send the Telegram ID of the volunteer to remove:',
    volunteerAdded: 'Volunteer added.',
    volunteerRemoved: 'Volunteer removed.',
    invalidId: 'Invalid ID format.',
    noNewRequests: '📋 No new requests at the moment.',
    chatWith: 'Chat started with',
    chatEndedNotify: 'The user has ended the chat.',
    chatContinues: 'Chat continues.',
    alreadyHaveChat: 'You already have an active chat.',
  },
  ru: {
    welcome:
      '👋 Добро пожаловать в ECHO — Платформу анонимной эмоциональной поддержки.\n\n' +
      'Мы соединим вас с обученными волонтерами, сохраняя вашу личность в тайне.\n\n' +
      '🛡 Используя бота, вы соглашаетесь с:\n' +
      '- [Пользовательским соглашением](https://docs.google.com/document/d/1r7usEg9XNfyELW2BmISFkgqpX0uCkBnFDeBVEDBDQ7I/edit?usp=sharing)\n' +
      '- [Политикой конфиденциальности](https://docs.google.com/document/d/1r7usEg9XNfyELW2BmISFkgqpX0uCkBnFDeBVEDBDQ7I/edit?usp=sharing)',
    shareBtn: 'Поделиться проблемой',
    aboutBtn: 'О проекте',
    emergencyBtn: 'Экстренная помощь',
    restartMsg: 'Пожалуйста, перезапустите бота командой /start',
    activeConvMsg:
      'У вас уже открыт активный чат. Можете писать ваши сообщения ниже или введите /end для завершения.',
    enterTopic:
      "📝 Пожалуйста, введите короткую тему вашей проблемы (например: 'Стресс на работе', 'Одиночество'):",
    requestCreated:
      '💬 Заявка создана! Волонтер скоро подключится. Можете начинать писать ваш текст ниже, мы его передадим.',
    langChanged: 'Язык изменен на Русский 🇷🇺',
    accessDenied: 'Доступ запрещен.',
    noRequests: '📋 На данный момент новых заявок нет.',
    topicPrompt: 'Тема: ',
    volunteerJoined:
      '🟢 Волонтер подключился к чату! Теперь вы можете общаться анонимно. Для завершения введите /end.',
    endChatClient:
      '🔴 Волонтер завершил диалог. Спасибо за использование ECHO.',
    defaultReply:
      "Чтобы начать разговор, введите /request или нажмите 'Поделиться проблемой'",
    confirmEnd:
      'Вы действительно хотите закончить чат? Дальше проект не несет за вас ответственность.',
    yesEnd: 'Да, завершить',
    noEnd: 'Нет, продолжить',
    chatEndedUser: 'Вы завершили чат.',
    ratePrompt: 'Пожалуйста, оцените помощь волонтера от 1 до 5:',
    rateThanks: '✨ Спасибо! Ваша оценка сохранена.',
    isSatisfiedPrompt: 'Доволен ли пользователь оказанной помощью?',
    satYes: 'Да, доволен',
    satNo: 'Нет, требуется помощь',
    chatEndedVol: 'Вы успешно завершили диалог с пользователем.',
    aboutText:
      'ECHO — это платформа анонимной психологической поддержки, где подростки могут получить помощь от обученных волонтёров через зашифрованный чат в реальном времени.\n\n' +
      '🔒 Полная анонимность — никаких персональных данных\n' +
      '🛡 AES-256-GCM шифрование\n' +
      '🗑 Авто-удаление через 24 часа\n' +
      '⚡ Мгновенная доставка через WebSocket',
    emergencyText:
      '🆘 Экстренная помощь:\n\n' +
      '🇷🇺 Россия: 8-800-2000-122 (бесплатно, 24/7)\n' +
      '🇰🇿 Казахстан: 150 (конфиденциально)\n' +
      '🌍 Международный: befrienders.org/need-to-talk\n\n' +
      '⚠️ Если вы в непосредственной опасности, звоните в экстренные службы.',
    complexityLow: '🟢 Легкая',
    complexityMedium: '🟡 Средняя',
    complexityHigh: '🔴 Сложная',
    assessComplexity: 'Оцените сложность проблемы:',
    volWelcome:
      '👋 С возвращением, волонтёр!\n\nЯ буду присылать сюда новые запросы. Нажми «Принять», чтобы начать разговор.',
    noActiveChat: 'У вас нет активных чатов.',
    waitNewRequest: 'Сейчас нет активного чата. Подождите нового запроса.',
    chatAccepted: '✅ Чат принят! Сообщения, которые вы напишете, будут переданы подростку.',
    chatAlreadyTaken: '⚠️ Этот чат уже принят другим волонтёром или закрыт.',
    chatClosedOk: '✅ Чат успешно завершен.',
    volDashboard: '👨‍⚕️ Панель волонтёра:\n\nВыберите действие:',
    viewRequests: 'Посмотреть заявки',
    endCurrentChat: 'Завершить текущий чат',
    adminPanel: '🛡 Панель администратора:',
    viewStats: 'Статистика',
    addVolunteer: 'Добавить волонтёра',
    removeVolunteer: 'Удалить волонтёра',
    sendVolunteerId: 'Отправьте Telegram ID нового волонтёра:',
    sendVolunteerRemoveId: 'Отправьте Telegram ID волонтёра для удаления:',
    volunteerAdded: 'Волонтёр добавлен.',
    volunteerRemoved: 'Волонтёр удалён.',
    invalidId: 'Неверный формат ID.',
    noNewRequests: '📋 Нет новых заявок.',
    chatWith: 'Чат начат с',
    chatEndedNotify: 'Пользователь завершил чат.',
    chatContinues: 'Чат продолжается.',
    alreadyHaveChat: 'У вас уже есть активный чат.',
  },
};
