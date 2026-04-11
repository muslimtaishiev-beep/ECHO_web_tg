import React, { useState, useEffect, useRef } from 'react';
import { socket, connectSocket } from '../services/socket';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const moods = [
  { emoji: '✨', label: 'Отлично', value: 'great' },
  { emoji: '🌿', label: 'Спокойно', value: 'calm' },
  { emoji: '☁️', label: 'Устал', value: 'tired' },
  { emoji: '😔', label: 'Грустно', value: 'sad' },
  { emoji: '🌧️', label: 'Тяжело', value: 'hard' },
];

const topics = [
  'Тревога', 'Учёба', 'Семья', 'Одиночество', 'Дружба', 'Другое',
];

const crisisResources = [
  { name: 'Телефон доверия', number: '8-800-2000-122', note: 'Бесплатно, анонимно, круглосуточно' },
  { name: 'Помощь детям', number: '8-495-988-44-34', note: 'Линия помощи' },
];

export default function ChatPage() {
  const [step, setStep] = useState(localStorage.getItem('user_token') ? 'dashboard' : 'nickname'); 
  const [nickname, setNickname] = useState(localStorage.getItem('user_nickname') || '');
  const [mood, setMood] = useState('');
  const [topic, setTopic] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [volunteerName, setVolunteerName] = useState('');
  const [chatEnded, setChatEnded] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const navigate = useNavigate();

  const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

  useEffect(() => {
    if (step === 'dashboard') {
      fetchHistory();
    }
  }, [step]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('user_token');
      const res = await fetch(`${API_URL}/chat/user-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const sessionId = useRef(
    localStorage.getItem('echo_session') || `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    localStorage.setItem('echo_session', sessionId.current);
  }, []);

  // Socket event listeners
  useEffect(() => {
    const onWaiting = (data) => {
      setRoomId(data.roomId);
      setStep('waiting');
    };

    const onStarted = (data) => {
      setVolunteerName(data.volunteerName);
      setStep('chatting');
      toast.success('Волонтёр подключился!');
    };

    const onNewMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    const onTypingShow = () => setIsTyping(true);
    const onTypingHide = () => setIsTyping(false);

    const onEnded = () => {
      setChatEnded(true);
    };

    const onPartnerDisconnected = () => {
      setChatEnded(true);
    };

    socket.on('chat:waiting', onWaiting);
    socket.on('chat:started', onStarted);
    socket.on('message:new', onNewMessage);
    socket.on('typing:show', onTypingShow);
    socket.on('typing:hide', onTypingHide);
    socket.on('chat:ended', onEnded);
    socket.on('partner:disconnected', onPartnerDisconnected);

    return () => {
      socket.off('chat:waiting', onWaiting);
      socket.off('chat:started', onStarted);
      socket.off('message:new', onNewMessage);
      socket.off('typing:show', onTypingShow);
      socket.off('typing:hide', onTypingHide);
      socket.off('chat:ended', onEnded);
      socket.off('partner:disconnected', onPartnerDisconnected);
    };
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const requestChat = () => {
    connectSocket();
    socket.emit('chat:request', {
      nickname,
      mood,
      topic,
      sessionId: sessionId.current,
      userToken: localStorage.getItem('user_token') || undefined,
    });
  };

  const sendMessage = () => {
    if (!input.trim() || !roomId) return;
    socket.emit('message:send', {
      roomId,
      content: input.trim(),
      senderType: 'anon',
    });
    setInput('');
    socket.emit('typing:stop', { roomId, senderType: 'anon' });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (roomId) {
      socket.emit('typing:start', { roomId, senderType: 'anon' });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', { roomId, senderType: 'anon' });
      }, 1500);
    }
  };

  const addEmoji = (emoji) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const closeChat = () => {
    if (roomId) {
      socket.emit('chat:close', { roomId });
      setShowCloseModal(false);
    }
  };

  const goHome = () => {
    socket.disconnect();
    if (localStorage.getItem('user_token')) {
      setStep('dashboard');
    } else {
      navigate('/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_nickname');
    navigate('/');
  };

  const giveFeedback = (emoji) => {
    setFeedbackGiven(true);
    toast('Спасибо за отзыв! 💛', { icon: emoji });
  };

  // ─── STEP: DASHBOARD (For registered users) ───
  if (step === 'dashboard') {
    return (
      <div className="min-h-screen bg-surface flex flex-col px-4 py-8">
        <header className="max-w-4xl w-full mx-auto flex justify-between items-center mb-8">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-[#785500] font-headline font-bold hover:opacity-80 transition-opacity"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            На главную
          </button>
          <button 
            onClick={handleLogout}
            className="text-sm text-error font-headline font-bold hover:underline"
          >
            Выйти
          </button>
        </header>

        <div className="max-w-4xl w-full mx-auto space-y-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1 bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl shadow-amber-900/5">
              <h1 className="text-3xl font-headline font-extrabold text-[#322f22]">Привет, {nickname}!</h1>
              <p className="text-[#5f5b4d] mt-2">Здесь твоя безопасная зона. Начни новый диалог, если нужна поддержка.</p>
              
              <button 
                onClick={() => setStep('mood')}
                className="mt-6 px-8 py-4 rounded-full font-headline font-bold bg-[#785500] text-white shadow-lg shadow-[#785500]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-xl">chat</span>
                Начать новый чат
              </button>
            </div>

            <div className="w-full md:w-1/3 bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl shadow-amber-900/5">
              <h2 className="text-xl font-headline font-extrabold text-[#322f22] mb-4">История разговоров</h2>
              {loadingHistory ? (
                <p className="text-sm text-[#5f5b4d]">Загрузка...</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-[#5f5b4d] italic">Вы еще не начинали чат.</p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {history.map(h => (
                    <div key={h.id} className="p-4 bg-[#f8f0dc]/50 rounded-xl border border-[#efe8d2]/50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#785500]">{h.topic}</span>
                        <span className="text-[10px] text-[#5f5b4d]">{new Date(h.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-bold text-[#322f22]">Волонтёр: {h.volunteerName || 'Аноним'}</p>
                      <p className="text-xs text-[#5f5b4d] mt-1">Статус: {h.status === 'closed' ? 'Завершён' : 'Активен'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            Это действие нельзя отменить. Все сообщения будут удалены через 24 часа.
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

  // ─── CRISIS RESOURCES PANEL ───
  const CrisisPanel = () => (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4">
      <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-fadeUp">
        <div className="flex items-center justify-between">
          <h3 className="font-headline font-bold text-lg text-on-surface">Нужна помощь сейчас?</h3>
          <button onClick={() => setShowCrisis(false)} className="p-1 rounded-full hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>
        <p className="text-sm text-on-surface-variant font-body">
          Если тебе или кому-то рядом нужна срочная помощь, позвони:
        </p>
        <div className="space-y-3">
          {crisisResources.map((r) => (
            <a
              key={r.number}
              href={`tel:${r.number}`}
              className="flex items-center gap-4 p-4 rounded-xl bg-error/5 border border-error/10 hover:bg-error/10 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined msf text-error">call</span>
              </div>
              <div>
                <p className="font-headline font-bold text-sm text-on-surface">{r.name}</p>
                <p className="font-headline font-bold text-error text-lg">{r.number}</p>
                <p className="text-xs text-on-surface-variant">{r.note}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── CRISIS FAB (Floating Action Button) ───
  const CrisisFAB = () => (
    <button
      onClick={() => setShowCrisis(true)}
      className="fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full bg-error/10 border border-error/20 flex items-center justify-center shadow-lg hover:bg-error/20 transition-all group"
      title="Нужна помощь сейчас?"
    >
      <span className="material-symbols-outlined msf text-error text-xl">emergency</span>
    </button>
  );

  // ─── STEP: NICKNAME ───
  if (step === 'nickname') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8 animate-fadeUp">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined msf text-on-primary-container text-3xl">person</span>
            </div>
            <h2 className="font-headline text-3xl font-extrabold text-on-surface">Придумай никнейм</h2>
            <p className="text-on-surface-variant font-body">Это может быть что угодно. Мы не будем знать, кто ты.</p>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Например: Звёздочка, Тень_42, Анон..."
              className="w-full px-5 py-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body text-base focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary transition-all placeholder:text-on-surface-variant/40"
              maxLength={20}
              onKeyDown={(e) => e.key === 'Enter' && nickname.trim() && setStep('mood')}
            />
            <button
              onClick={() => nickname.trim() && setStep('mood')}
              disabled={!nickname.trim()}
              className="w-full py-4 rounded-full font-headline font-bold text-base bg-gradient-to-br from-primary to-primary-container text-on-primary-container shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:scale-100"
            >
              Продолжить →
            </button>
          </div>
          <button onClick={goHome} className="block mx-auto text-sm text-on-surface-variant hover:text-primary transition-colors font-body">
            ← Назад на главную
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP: MOOD ───
  if (step === 'mood') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="max-w-lg w-full space-y-8 animate-fadeUp">
          <div className="text-center space-y-3">
            <h2 className="font-headline text-3xl font-extrabold text-on-surface">Привет, {nickname}!</h2>
            <p className="text-on-surface-variant font-body">Как ты себя чувствуешь прямо сейчас?</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {moods.map((m) => (
              <button
                key={m.value}
                onClick={() => { setMood(m.value); setStep('topic'); }}
                className={`mood-btn flex flex-col items-center gap-3 p-6 rounded-xl bg-surface-container-lowest hover:bg-primary-container/30 transition-all w-28 group active:scale-95 border-2 ${mood === m.value ? 'border-primary' : 'border-transparent'}`}
              >
                <span className="mood-emoji">{m.emoji}</span>
                <span className="font-headline font-bold text-xs text-on-surface-variant group-hover:text-on-primary-container">{m.label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => localStorage.getItem('user_token') ? setStep('dashboard') : setStep('nickname')} className="block mx-auto text-sm text-on-surface-variant hover:text-primary transition-colors font-body">
            ← Назад
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP: TOPIC ───
  if (step === 'topic') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="max-w-lg w-full space-y-8 animate-fadeUp">
          <div className="text-center space-y-3">
            <h2 className="font-headline text-3xl font-extrabold text-on-surface">О чём хочешь поговорить?</h2>
            <p className="text-on-surface-variant font-body">Выбери тему — это поможет найти подходящего волонтёра.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className={`px-5 py-3 rounded-full font-headline font-bold text-sm transition-all active:scale-95 ${topic === t ? 'bg-primary-container text-on-primary-container shadow-md' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-primary-container/30'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={requestChat}
            disabled={!topic}
            className="w-full max-w-xs mx-auto block py-4 rounded-full font-headline font-bold text-base bg-gradient-to-br from-primary to-primary-container text-on-primary-container shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:scale-100"
          >
            Найти волонтёра →
          </button>
          <button onClick={() => setStep('mood')} className="block mx-auto text-sm text-on-surface-variant hover:text-primary transition-colors font-body">
            ← Назад
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP: WAITING (with skeleton pulse) ───
  if (step === 'waiting') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <CrisisFAB />
        {showCrisis && <CrisisPanel />}
        <div className="max-w-md w-full space-y-8 text-center animate-fadeUp">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-primary-container/30 animate-breathe"></div>
            <div className="absolute inset-0 rounded-full bg-primary-container/20 animate-pulse2"></div>
            <div className="absolute inset-3 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined msf text-on-primary-container text-3xl">hourglass_top</span>
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="font-headline text-2xl font-extrabold text-on-surface">Ищем волонтёра...</h2>
            <p className="text-on-surface-variant font-body">Кто-то скоро будет здесь. Пока можешь собраться с мыслями.</p>
          </div>

          {/* Skeleton "preview" of the chat that's about to happen */}
          <div className="space-y-3 px-4 opacity-40">
            <div className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-surface-container-highest animate-pulse flex-shrink-0"></div>
              <div className="rounded-xl rounded-bl-none bg-surface-container-highest animate-pulse h-10 w-48"></div>
            </div>
            <div className="flex items-end gap-2 flex-row-reverse">
              <div className="w-7 h-7 rounded-full bg-primary-container/50 animate-pulse flex-shrink-0"></div>
              <div className="rounded-xl rounded-br-none bg-primary-container/30 animate-pulse h-10 w-36"></div>
            </div>
            <div className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-surface-container-highest animate-pulse flex-shrink-0"></div>
              <div className="rounded-xl rounded-bl-none bg-surface-container-highest animate-pulse h-14 w-56"></div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-secondary-container/30 w-fit mx-auto">
            <span className="material-symbols-outlined msf text-secondary text-sm">lock</span>
            <span className="text-xs font-headline font-bold text-on-secondary-container uppercase tracking-widest">AES-256 · шифрование активно</span>
          </div>
          <button onClick={goHome} className="text-sm text-on-surface-variant hover:text-error transition-colors font-body">
            Отменить
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP: CHATTING ───
  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      {showCloseModal && <ConfirmCloseModal />}
      {showCrisis && <CrisisPanel />}
      <CrisisFAB />

      {/* Chat Header */}
      <div className="glass sticky top-0 z-50 border-b border-amber-200/20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined msf text-on-secondary-container">volunteer_activism</span>
            </div>
            <div>
              <p className="font-headline font-bold text-sm text-on-surface">{volunteerName || 'Волонтёр'}</p>
              {!chatEnded ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                  <p className="text-xs text-secondary font-headline font-bold uppercase tracking-widest">онлайн</p>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl w-full mx-auto space-y-4">
        {/* System welcome message */}
        <div className="text-center py-3">
          <p className="text-xs text-on-surface-variant/60 font-body">
            🔒 Все сообщения зашифрованы · Никто не видит ваши данные
          </p>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-2 ${msg.senderType === 'anon' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${msg.senderType === 'anon' ? 'bg-primary-container' : 'bg-surface-container-highest'}`}>
              <span className={`material-symbols-outlined msf text-xs ${msg.senderType === 'anon' ? 'text-on-primary-container' : 'text-on-surface-variant'}`}>
                {msg.senderType === 'anon' ? 'mood' : 'person'}
              </span>
            </div>
            <div className={`rounded-xl p-3.5 max-w-[80%] shadow-sm ${
              msg.senderType === 'anon'
                ? 'bg-primary-container rounded-br-none'
                : 'bg-surface-container-lowest rounded-bl-none'
            }`}>
              <p className={`text-sm leading-relaxed ${msg.senderType === 'anon' ? 'text-on-primary-container' : 'text-on-surface'}`}>
                {msg.content}
              </p>
              <span className={`text-[10px] block mt-1.5 ${msg.senderType === 'anon' ? 'text-on-primary-container/50 text-right' : 'text-on-surface-variant/50'}`}>
                {new Date(msg.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-surface-container-highest flex-shrink-0 flex items-center justify-center">
              <span className="material-symbols-outlined msf text-on-surface-variant text-xs">person</span>
            </div>
            <div className="bg-surface-container-lowest rounded-xl rounded-bl-none px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center h-4">
                <span className="w-2 h-2 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: '0s' }}></span>
                <span className="w-2 h-2 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                <span className="w-2 h-2 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: '0.3s' }}></span>
              </div>
            </div>
          </div>
        )}

        {/* Chat ended — with feedback */}
        {chatEnded && (
          <div className="text-center py-6 space-y-5">
            <p className="text-on-surface-variant font-body">Чат завершён. Надеемся, тебе стало легче 💛</p>

            {!feedbackGiven ? (
              <div className="space-y-3">
                <p className="text-sm font-headline font-bold text-on-surface">Как ты себя чувствуешь сейчас?</p>
                <div className="flex justify-center gap-4">
                  {[
                    { emoji: '😊', label: 'Лучше' },
                    { emoji: '😐', label: 'Так же' },
                    { emoji: '😔', label: 'Не помогло' },
                  ].map((f) => (
                    <button
                      key={f.label}
                      onClick={() => giveFeedback(f.emoji)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary-container/20 transition-all active:scale-90"
                    >
                      <span className="text-3xl">{f.emoji}</span>
                      <span className="text-xs text-on-surface-variant font-body">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-secondary font-body">Спасибо за отзыв! Мы ценим это 💛</p>
            )}

            <button onClick={goHome} className="px-6 py-3 rounded-full font-headline font-bold text-sm bg-primary-container text-on-primary-container hover:scale-105 transition-all">
              Вернуться на главную
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!chatEnded && (
        <div className="glass sticky bottom-0 border-t border-amber-200/20">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2 relative">
            {showEmojiPicker && (
              <div className="absolute bottom-full left-4 mb-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-3 border border-amber-200/40 grid grid-cols-5 gap-2 z-50 animate-fadeUp">
                {['😀', '😂', '🥺', '😭', '❤️', '👍', '🙏', '✨', '🔥', '🤔', '😊', '🥰', '😔', '💪', '👋'].map(em => (
                  <button key={em} onClick={() => addEmoji(em)} className="text-xl hover:scale-125 transition-transform active:scale-95">
                    {em}
                  </button>
                ))}
              </div>
            )}
            
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-11 h-11 rounded-full flex items-center justify-center text-[#5f5b4d] hover:bg-[#f8f0dc] transition-colors"
            >
              <span className="material-symbols-outlined">sentiment_satisfied</span>
            </button>
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Напиши сообщение..."
              className="flex-1 bg-surface-container-low rounded-full px-5 py-3 text-sm text-on-surface font-body placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-md shadow-primary/20 flex-shrink-0 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
            >
              <span className="material-symbols-outlined msf text-on-primary-container text-lg">send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
