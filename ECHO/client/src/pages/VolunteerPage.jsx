import React, { useState, useEffect, useRef, useCallback } from 'react';
import { socket, connectSocket } from '../services/socket';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// Gentle notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.15); // G5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Audio context not available, silent fallback
  }
};

export default function VolunteerPage() {
  const [view, setView] = useState('login'); // login | register | dashboard | chatting | pending
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState(localStorage.getItem('echo_volunteer_token') || '');
  const [volunteer, setVolunteer] = useState(null);
  const [queue, setQueue] = useState([]);
  const [activeRoomsList, setActiveRoomsList] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatEnded, setChatEnded] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isMuted, setIsMuted] = useState(localStorage.getItem('echo_muted') === 'true');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const navigate = useNavigate();

  // Check existing token on mount
  useEffect(() => {
    if (token) {
      api.getMe(token)
        .then((user) => {
          setVolunteer(user);
          setView('dashboard');
          initSocket(user.id);
        })
        .catch(() => {
          localStorage.removeItem('echo_volunteer_token');
          setToken('');
        });
    }
  }, []);

  const initSocket = (volunteerId) => {
    connectSocket();
    socket.emit('volunteer:join', { volunteerId });
  };

  const loadActiveRooms = useCallback(async (authToken, volId) => {
    try {
      const rooms = await api.getVolunteerRooms(authToken, volId);
      setActiveRoomsList(rooms);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (view === 'dashboard' && token && volunteer) {
      loadActiveRooms(token, volunteer.id);
    }
  }, [view, token, volunteer, loadActiveRooms]);

  // Socket listeners
  // Play sound when queue grows
  const prevQueueLenRef = useRef(0);
  useEffect(() => {
    if (queue.length > prevQueueLenRef.current && view === 'dashboard') {
      if (!isMuted) playNotificationSound();
      // Browser notification if page is not focused
      if (document.hidden && Notification.permission === 'granted') {
        new Notification('Echo — Новый запрос', {
          body: `${queue[queue.length - 1]?.nickname || 'Аноним'} ждёт поддержки`,
          icon: '/echo-logo.svg',
        });
      }
    }
    prevQueueLenRef.current = queue.length;
  }, [queue, view]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const onQueueUpdated = (q) => setQueue(q);
    const onNewMessage = (msg) => setMessages((prev) => [...prev, msg]);
    const onTypingShow = () => setIsTyping(true);
    const onTypingHide = () => setIsTyping(false);
    const onChatEnded = () => setChatEnded(true);
    const onPartnerDisconnected = () => setChatEnded(true);

    socket.on('queue:updated', onQueueUpdated);
    socket.on('message:new', onNewMessage);
    socket.on('typing:show', onTypingShow);
    socket.on('typing:hide', onTypingHide);
    socket.on('chat:ended', onChatEnded);
    socket.on('partner:disconnected', onPartnerDisconnected);

    return () => {
      socket.off('queue:updated', onQueueUpdated);
      socket.off('message:new', onNewMessage);
      socket.off('typing:show', onTypingShow);
      socket.off('typing:hide', onTypingHide);
      socket.off('chat:ended', onChatEnded);
      socket.off('partner:disconnected', onPartnerDisconnected);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleLogin = async () => {
    try {
      setError('');
      const data = await api.login(username, password);
      localStorage.setItem('echo_volunteer_token', data.access_token);
      setToken(data.access_token);
      setVolunteer(data.volunteer);
      setView('dashboard');
      initSocket(data.volunteer.id);
      toast.success(`Добро пожаловать, ${data.volunteer.displayName}! 👋`);
    } catch (e) {
      const msg = e.message || 'Ошибка входа';
      // Handle pending approval case
      if (msg.toLowerCase().includes('pending') || msg.toLowerCase().includes('approval')) {
        setView('pending');
      } else {
        setError(msg);
        toast.error(msg);
      }
    }
  };

  const handleRegister = async () => {
    if (!username || !password || !displayName || !firstName || !lastName || !phone) {
      setError('Пожалуйста, заполните все обязательные поля.');
      return;
    }
    try {
      setError('');
      const data = await api.register(username, password, displayName, firstName, lastName, phone, telegramId);
      // If server returns no token, volunteer needs approval
      if (!data.access_token) {
        setVolunteer(data.volunteer);
        setView('pending');
        toast.success('Заявка отправлена! Ожидайте подтверждения. ✨');
      } else {
        localStorage.setItem('echo_volunteer_token', data.access_token);
        setToken(data.access_token);
        setVolunteer(data.volunteer);
        setView('dashboard');
        initSocket(data.volunteer.id);
        toast.success('Регистрация успешна! 🎉');
      }
    } catch (e) {
      setError(e.message || 'Ошибка регистрации');
      toast.error(e.message || 'Ошибка регистрации');
    }
  };

  const acceptChat = (roomId) => {
    socket.emit('chat:accept', { roomId, volunteerId: volunteer.id });
    setActiveRoom(roomId);
    setMessages([]);
    setChatEnded(false);
    setView('chatting');
  };

  const resumeChat = async (roomId) => {
    try {
      const msgs = await api.getMessages(token, roomId);
      setMessages(msgs);
      setActiveRoom(roomId);
      setChatEnded(false);
      setView('chatting');
    } catch (e) {
      toast.error('Не удалось загрузить историю чата');
    }
  };

  const sendMessage = () => {
    if (!input.trim() || !activeRoom) return;
    socket.emit('message:send', {
      roomId: activeRoom,
      content: input.trim(),
      senderType: 'volunteer',
    });
    setInput('');
    socket.emit('typing:stop', { roomId: activeRoom, senderType: 'volunteer' });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (activeRoom) {
      socket.emit('typing:start', { roomId: activeRoom, senderType: 'volunteer' });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', { roomId: activeRoom, senderType: 'volunteer' });
      }, 1500);
    }
  };

  const closeChat = () => {
    if (activeRoom) {
      socket.emit('chat:close', { roomId: activeRoom });
      setShowCloseModal(false);
    }
  };

  const backToDashboard = () => {
    setActiveRoom(null);
    setMessages([]);
    setChatEnded(false);
    setView('dashboard');
  };

  const logout = () => {
    localStorage.removeItem('echo_volunteer_token');
    socket.disconnect();
    setToken('');
    setVolunteer(null);
    setView('login');
  };

  const moodEmojis = { great: '✨', calm: '🌿', tired: '☁️', sad: '😔', hard: '🌧️' };

  // ─── PENDING APPROVAL ───
  if (view === 'pending') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6 animate-fadeUp">
          <div className="w-24 h-24 rounded-full bg-secondary-container/50 flex items-center justify-center mx-auto shadow-lg">
            <span className="text-5xl">⏳</span>
          </div>
          <div className="space-y-3">
            <h2 className="font-headline text-3xl font-extrabold text-on-surface">Заявка отправлена! 🎉</h2>
            <p className="text-on-surface-variant font-body text-base leading-relaxed">
              Ваша заявка на регистрацию волонтёра успешно получена.<br />
              Администратор рассмотрит её и уведомит вас в Telegram.
            </p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-5 text-left space-y-2">
            <p className="text-xs font-headline font-bold uppercase tracking-widest text-secondary">Что дальше?</p>
            <ul className="space-y-2 text-sm text-on-surface-variant font-body">
              <li>📱 Ожидайте сообщения в Telegram от бота</li>
              <li>✅ После подтверждения вы сможете войти</li>
              <li>🔑 Войдите, используя свой логин и пароль</li>
            </ul>
          </div>
          <button
            onClick={() => { setView('login'); setError(''); }}
            className="w-full py-4 rounded-full font-headline font-bold text-base bg-gradient-to-br from-secondary to-secondary-container text-on-secondary-container shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
          >
            🔑 Войти после подтверждения
          </button>
          <button onClick={() => navigate('/')} className="block mx-auto text-sm text-on-surface-variant hover:text-primary transition-colors font-body">
            ← На главную
          </button>
        </div>
      </div>
    );
  }

  // ─── LOGIN / REGISTER ───
  if (view === 'login' || view === 'register') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-6 animate-fadeUp">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined msf text-on-secondary-container text-3xl">volunteer_activism</span>
            </div>
            <h2 className="font-headline text-3xl font-extrabold text-on-surface">
              {view === 'login' ? '👋 Вход для волонтёра' : '🤝 Регистрация волонтёра'}
            </h2>
            {view === 'register' && (
              <p className="text-sm text-on-surface-variant font-body">Заполните все поля — администратор рассмотрит вашу заявку</p>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-error/10 text-error text-sm font-body border border-error/20">⚠️ {error}</div>
          )}

          <div className="space-y-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="🔑 Логин"
              className="w-full px-5 py-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-secondary-container focus:border-secondary transition-all"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="🔒 Пароль"
              className="w-full px-5 py-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-secondary-container focus:border-secondary transition-all"
              onKeyDown={(e) => e.key === 'Enter' && (view === 'login' ? handleLogin() : handleRegister())}
            />
            {view === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="👤 Фамилия"
                    className="w-full px-5 py-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-secondary-container focus:border-secondary transition-all"
                  />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="👋 Имя"
                    className="w-full px-5 py-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-secondary-container focus:border-secondary transition-all"
                  />
                </div>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="🏷️ Имя для отображения (например: Алия)"
                  className="w-full px-5 py-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-secondary-container focus:border-secondary transition-all"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="📞 Телефон (+7...)"
                  className="w-full px-5 py-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-secondary-container focus:border-secondary transition-all"
                />
                <input
                  type="text"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  placeholder="🆔 Ваш Telegram ID (числовой)"
                  className="w-full px-5 py-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-secondary-container focus:border-secondary transition-all"
                />
                <p className="text-xs text-on-surface-variant/70 font-body px-1">💡 Telegram ID можно узнать у бота @userinfobot</p>
              </>
            )}
            <button
              onClick={view === 'login' ? handleLogin : handleRegister}
              className="w-full py-4 rounded-full font-headline font-bold text-base bg-gradient-to-br from-secondary to-secondary-container text-on-secondary-container shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              {view === 'login' ? '🚀 Войти' : '✉️ Отправить заявку'}
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-sm text-on-surface-variant hover:text-secondary transition-colors font-body"
            >
              {view === 'login' ? 'Нет аккаунта? Зарегистрироваться →' : '← Уже есть аккаунт? Войти'}
            </button>
          </div>

          <button onClick={() => navigate('/')} className="block mx-auto text-sm text-on-surface-variant hover:text-primary transition-colors font-body">
            ← На главную
          </button>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ───
  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-surface">
        <div className="glass sticky top-0 z-50 border-b border-amber-200/20">
          <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined msf text-on-secondary-container">volunteer_activism</span>
              </div>
              <div>
                <p className="font-headline font-bold text-on-surface">{volunteer?.displayName || volunteer?.username}</p>
                <p className="text-xs text-secondary font-headline font-bold uppercase tracking-widest">Волонтёр</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const next = !isMuted; setIsMuted(next); localStorage.setItem('echo_muted', String(next)); toast(next ? 'Звук выключен' : 'Звук включен', { icon: next ? '🔇' : '🔔' }); }}
                className="p-2 rounded-full hover:bg-surface-container transition-colors" title={isMuted ? 'Включить звук' : 'Выключить звук'}
              >
                <span className="material-symbols-outlined text-on-surface-variant text-xl">{isMuted ? 'volume_off' : 'volume_up'}</span>
              </button>
              <button onClick={logout} className="px-4 py-2 rounded-full text-sm font-headline font-bold text-on-surface-variant hover:bg-error/10 hover:text-error transition-all">
                Выйти
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8 space-y-12">
          
          {/* Активные диалоги */}
          <div className="space-y-4">
            <h2 className="font-headline text-2xl font-extrabold text-on-surface flex gap-2 items-center">
              <span className="material-symbols-outlined msf text-primary">forum</span>
              Активные диалоги
            </h2>
            {activeRoomsList.length === 0 ? (
              <p className="text-sm text-on-surface-variant font-body bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 text-center">
                У вас нет активных чатов. Примите кого-нибудь из очереди ☀️
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeRoomsList.map((room) => (
                  <div key={room.id} className="bg-primary-container/10 border border-primary/20 rounded-xl p-5 shadow-sm space-y-4 flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-container/50 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">{moodEmojis[room.mood] || '💬'}</span>
                        </div>
                        <div>
                          <p className="font-headline font-bold text-on-surface">{room.anonNickname}</p>
                          <p className="text-xs text-primary font-headline font-bold uppercase tracking-widest">{room.topic || 'Разговор'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                        <p className="text-xs text-secondary font-headline">в процессе</p>
                      </div>
                    </div>
                    <button
                      onClick={() => resumeChat(room.id)}
                      className="w-full mt-auto py-2.5 rounded-full font-headline font-bold text-sm bg-primary-container text-on-primary-container hover:bg-primary-container/80 transition-all flex justify-center items-center gap-2"
                    >
                      <span>Вернуться в чат</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-t border-amber-200/20" />

          {/* Очередь */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <h2 className="font-headline text-2xl font-extrabold text-on-surface">Очередь на помощь</h2>
              <p className="text-sm text-on-surface-variant font-body">
                {queue.length > 0 ? `${queue.length} ждут` : 'Пусто'}
              </p>
            </div>

            {queue.length === 0 ? (
              <div className="text-center py-12 space-y-4 bg-surface-container-lowest rounded-xl border border-outline-variant/10">
                <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined msf text-on-surface-variant text-3xl">spa</span>
                </div>
                <p className="text-on-surface-variant font-body">Очередь пуста. Новые запросы появятся автоматически.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {queue.map((item) => (
                  <div key={item.roomId} className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/10 hover:shadow-md transition-shadow space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">{moodEmojis[item.mood] || '💬'}</span>
                      </div>
                      <div>
                        <p className="font-headline font-bold text-on-surface">{item.nickname}</p>
                        <p className="text-xs text-on-surface-variant font-body">Ждёт {item.waitingMinutes || '< 1'} мин</p>
                      </div>
                    </div>
                    <button
                      onClick={() => acceptChat(item.roomId)}
                      className="w-full py-2.5 rounded-full font-headline font-bold text-sm bg-gradient-to-br from-secondary to-secondary-container text-on-secondary-container shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      Принять чат
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── CONFIRMATION MODAL ───
  const ConfirmCloseModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-5 animate-fadeUp">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined msf text-error text-2xl">warning</span>
          </div>
          <h3 className="font-headline font-bold text-lg text-on-surface">Завершить чат?</h3>
          <p className="text-sm text-on-surface-variant font-body">
            Вы уверены, что хотите завершить чат с подростком?
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCloseModal(false)}
            className="flex-1 py-3 rounded-full text-sm font-headline font-bold text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-all"
          >
            Отмена
          </button>
          <button
            onClick={closeChat}
            className="flex-1 py-3 rounded-full text-sm font-headline font-bold text-white bg-error hover:bg-error/90 transition-all"
          >
            Завершить
          </button>
        </div>
      </div>
    </div>
  );

  // ─── CHATTING (Volunteer side) ───
  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      {showCloseModal && <ConfirmCloseModal />}
      <div className="glass sticky top-0 z-50 border-b border-amber-200/20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={backToDashboard} className="p-2 rounded-full hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
            </button>
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined msf text-on-primary-container">mood</span>
            </div>
            <div>
              <p className="font-headline font-bold text-sm text-on-surface">Аноним</p>
              {!chatEnded ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                  <p className="text-xs text-secondary font-headline font-bold uppercase tracking-widest">в чате</p>
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant font-body">Чат завершён</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary-container/40 rounded-full">
              <span className="material-symbols-outlined msf text-secondary text-xs">lock</span>
              <span className="text-[10px] text-secondary font-headline font-bold uppercase tracking-widest">защищено</span>
            </div>
            {!chatEnded && (
              <button onClick={() => setShowCloseModal(true)} className="p-2 rounded-full hover:bg-error/10 transition-colors" title="Завершить чат">
                <span className="material-symbols-outlined text-error text-lg">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl w-full mx-auto space-y-4">
        <div className="text-center py-3">
          <p className="text-xs text-on-surface-variant/60 font-body">🔒 AES-256 · Сообщения зашифрованы</p>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-2 ${msg.senderType === 'volunteer' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${msg.senderType === 'volunteer' ? 'bg-secondary-container' : 'bg-primary-container'}`}>
              <span className={`material-symbols-outlined msf text-xs ${msg.senderType === 'volunteer' ? 'text-on-secondary-container' : 'text-on-primary-container'}`}>
                {msg.senderType === 'volunteer' ? 'volunteer_activism' : 'mood'}
              </span>
            </div>
            <div className={`rounded-xl p-3.5 max-w-[80%] shadow-sm ${
              msg.senderType === 'volunteer'
                ? 'bg-secondary-container/50 rounded-br-none'
                : 'bg-surface-container-lowest rounded-bl-none'
            }`}>
              <p className="text-sm leading-relaxed text-on-surface">{msg.content}</p>
              <span className={`text-[10px] block mt-1.5 text-on-surface-variant/50 ${msg.senderType === 'volunteer' ? 'text-right' : ''}`}>
                {new Date(msg.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-primary-container flex-shrink-0 flex items-center justify-center">
              <span className="material-symbols-outlined msf text-on-primary-container text-xs">mood</span>
            </div>
            <div className="bg-surface-container-lowest rounded-xl rounded-bl-none px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-2 h-2 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: '0s' }}></span>
                <span className="w-2 h-2 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                <span className="w-2 h-2 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: '0.3s' }}></span>
              </div>
            </div>
          </div>
        )}

        {chatEnded && (
          <div className="text-center py-6 space-y-4">
            <p className="text-on-surface-variant font-body">Чат завершён.</p>
            <button onClick={backToDashboard} className="px-6 py-3 rounded-full font-headline font-bold text-sm bg-secondary-container text-on-secondary-container hover:scale-105 transition-all">
              Вернуться к очереди
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {!chatEnded && (
        <div className="glass sticky bottom-0 border-t border-amber-200/20">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Напиши ответ..."
              className="flex-1 bg-surface-container-low rounded-full px-5 py-3 text-sm text-on-surface font-body placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary-container"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="w-11 h-11 rounded-full bg-gradient-to-br from-secondary to-secondary-container flex items-center justify-center shadow-md shadow-secondary/20 flex-shrink-0 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
            >
              <span className="material-symbols-outlined msf text-on-secondary-container text-lg">send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
