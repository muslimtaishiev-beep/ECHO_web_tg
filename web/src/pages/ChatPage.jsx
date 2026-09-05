import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ensureAnonymousUser, auth } from '../lib/firebase.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import {
  requestChat, watchRoom, watchMessages, sendMessage, closeRoom, getRoom, getActiveRoom,
} from '../services/chat.js';
import { submitReview } from '../services/review.js';

const moods = [
  { emoji: '✨', label: 'Отлично', value: 'great' },
  { emoji: '🌿', label: 'Спокойно', value: 'calm' },
  { emoji: '☁️', label: 'Устал', value: 'tired' },
  { emoji: '😔', label: 'Грустно', value: 'sad' },
  { emoji: '🌧️', label: 'Тяжело', value: 'hard' },
];

const topics = ['Тревога', 'Учёба', 'Семья', 'Одиночество', 'Дружба', 'Другое'];

const crisisResources = [
  { name: 'Телефон доверия', number: '8-800-2000-122', note: 'Бесплатно, анонимно, круглосуточно' },
  { name: 'Помощь детям', number: '8-495-988-44-34', note: 'Линия помощи' },
];

export default function ChatPage() {
  const [step, setStep] = useState('nickname'); // nickname | mood | waiting | chatting | ended
  const [nickname, setNickname] = useState('');
  const [mood, setMood] = useState('');
  const [topic, setTopic] = useState('');
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [decrypted, setDecrypted] = useState([]);
  const [input, setInput] = useState('');
  const [volunteerName, setVolunteerName] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const [userId, setUserId] = useState(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // 1. Ensure an anonymous identity (or reuse the signed-in permanent account).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const u = await ensureAnonymousUser();
        if (active) setUserId(u.uid);
      } catch (e) {
        if (active) toast.error(e.message);
      }
    })();
    return () => { active = false; };
  }, []);

  // 2. Restore an existing active/waiting room for this user.
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const r = await getActiveRoom(userId);
        if (r) {
          setRoom(r);
          setNickname(r.anonNickname || '');
          setMood(r.mood || '');
          setTopic(r.topic || '');
          if (r.status === 'active') {
            setVolunteerName(r.volunteerName || 'Волонтёр');
            setStep('chatting');
          } else {
            setStep('waiting');
          }
        }
      } catch (e) { /* ignore */ }
    })();
  }, [userId]);

  // 3. Watch the active room + messages.
  useEffect(() => {
    if (!room?.id) return undefined;
    const offRoom = watchRoom(room.id, (r) => {
      if (!r) return;
      setRoom(r);
      if (r.status === 'active') {
        setVolunteerName(r.volunteerName || 'Волонтёр');
        setStep('chatting');
      } else if (r.status === 'closed') {
        setStep('ended');
      }
    });
    const offMsgs = watchMessages(room.id, setMessages);
    return () => { offRoom(); offMsgs(); };
  }, [room?.id]);

  // 4. Decrypt messages.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!room?.encryptionKey) { setDecrypted([]); return; }
      const out = await Promise.all(messages.map(async (m) => ({
        id: m.id,
        senderType: m.senderType,
        createdAt: m.createdAt,
        text: await decrypt(m.content, m.iv, room.encryptionKey).catch(() => '[не расшифровано]'),
      })));
      if (!cancelled) setDecrypted(out);
    })();
    return () => { cancelled = true; };
  }, [messages, room?.encryptionKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [decrypted, step]);

  async function startChat() {
    if (!nickname.trim()) return toast.error('Придумайте никнейм');
    if (!mood) return toast.error('Выберите настроение');
    try {
      const { roomId } = await requestChat({
        nickname: nickname.trim(), mood, topic: topic || 'Общее', userId,
      });
      setRoom(await getRoom(roomId));
      setStep('waiting');
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !room?.encryptionKey) return;
    setInput('');
    try {
      const { content, iv } = await encrypt(text, room.encryptionKey);
      await sendMessage(room.id, { content, iv, senderType: 'anon' });
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function endChat() {
    try {
      await closeRoom(room.id);
      setStep('ended');
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function giveFeedback(score) {
    if (!room?.volunteerId) return;
    try {
      await submitReview({ chatRoomId: room.id, volunteerId: room.volunteerId, userId: room.userId, score });
      setFeedbackGiven(true);
      toast.success('Спасибо за отзыв!');
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col font-body">
      {/* Header */}
      <header className="glass sticky top-0 z-40 border-b border-amber-200/20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#785500] font-headline font-bold hover:opacity-80">
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="font-headline font-extrabold text-lg text-[#322f22]">echo</span>
          </button>
          <button onClick={() => setShowCrisis(!showCrisis)} className="px-4 py-2 rounded-full text-xs font-headline font-bold text-[#924529] bg-[#f99774]/20 hover:bg-[#f99774]/30 transition-all">
            <span className="material-symbols-outlined text-sm align-middle">emergency</span> Помощь
          </button>
        </div>
      </header>

      {showCrisis && (
        <div className="max-w-3xl mx-auto px-4 pt-4 space-y-3">
          {crisisResources.map((r) => (
            <div key={r.number} className="bg-[#f99774]/10 border border-[#f99774]/20 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="font-headline font-bold text-[#5a1c03] text-sm">{r.name}</p>
                <p className="text-xs text-[#924529]/70 font-body">{r.note}</p>
              </div>
              <a href={`tel:${r.number}`} className="font-headline font-extrabold text-[#924529] text-lg">{r.number}</a>
            </div>
          ))}
        </div>
      )}

      {/* STEP: nickname */}
      {step === 'nickname' && (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center space-y-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-[#fec24a]/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-[#785500]">self_improvement</span>
            </div>
            <div>
              <h1 className="font-headline text-3xl font-extrabold text-[#322f22]">Привет, как тебя звать?</h1>
              <p className="text-[#5f5b4d] mt-2 font-body">Придумай никнейм — он полностью анонимен.</p>
            </div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && nickname.trim() && setStep('mood')}
              placeholder="Твой никнейм"
              className="w-full px-6 py-4 rounded-full bg-white text-center text-lg font-body text-[#322f22] border border-amber-200/40 focus:ring-2 focus:ring-[#785500] outline-none"
            />
            <button onClick={() => setStep('mood')} disabled={!nickname.trim()} className="w-full py-4 rounded-full font-headline font-bold text-base bg-gradient-to-br from-[#785500] to-[#fec24a] text-white shadow-xl shadow-[#785500]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40">
              Продолжить
            </button>
          </div>
        </main>
      )}

      {/* STEP: mood */}
      {step === 'mood' && (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg space-y-8">
            <div className="text-center">
              <h1 className="font-headline text-3xl font-extrabold text-[#322f22]">Как ты себя чувствуешь?</h1>
              <p className="text-[#5f5b4d] mt-2 font-body">Твой ответ анонимен и поможет найти волонтёра.</p>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {moods.map((m) => (
                <button key={m.value} onClick={() => setMood(m.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-3xl border transition-all ${mood === m.value ? 'bg-[#fec24a]/30 border-[#785500]/40 scale-105' : 'bg-white border-amber-200/40 hover:bg-[#f8f0dc]'}`}>
                  <span className="text-3xl">{m.emoji}</span>
                  <span className="text-xs font-headline font-bold text-[#322f22]">{m.label}</span>
                </button>
              ))}
            </div>
            <div>
              <p className="text-sm font-headline font-bold text-[#5f5b4d] mb-3 pl-1">Тема (необязательно)</p>
              <div className="flex flex-wrap gap-2">
                {topics.map((t) => (
                  <button key={t} onClick={() => setTopic(t === topic ? '' : t)}
                    className={`px-4 py-2 rounded-full text-sm font-body transition-all ${topic === t ? 'bg-[#785500] text-white' : 'bg-white text-[#5f5b4d] border border-amber-200/40 hover:bg-[#f8f0dc]'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={startChat} className="w-full py-4 rounded-full font-headline font-bold text-base bg-gradient-to-br from-[#785500] to-[#fec24a] text-white shadow-xl shadow-[#785500]/20 hover:scale-[1.02] active:scale-95 transition-all">
              Начать чат
            </button>
          </div>
        </main>
      )}

      {/* STEP: waiting */}
      {step === 'waiting' && (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full bg-[#fec24a]/30 animate-ping"></div>
              <div className="relative w-24 h-24 rounded-full bg-[#fec24a] flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-[#5a3f00]">hourglass_top</span>
              </div>
            </div>
            <h1 className="font-headline text-2xl font-extrabold text-[#322f22]">Ищем волонтёра...</h1>
            <p className="text-[#5f5b4d] font-body max-w-xs mx-auto">Обычно это занимает меньше минуты. Не уходи — мы вот-вот подключим собеседника.</p>
          </div>
        </main>
      )}

      {/* STEP: chatting */}
      {step === 'chatting' && (
        <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto">
          <div className="px-4 py-3 flex items-center gap-3 bg-white/60 border-b border-amber-200/20">
            <div className="w-10 h-10 rounded-full bg-[#baeed1] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#2a5b45]">volunteer_activism</span>
            </div>
            <div>
              <p className="font-headline font-bold text-sm text-[#322f22]">{volunteerName}</p>
              <p className="text-xs text-[#34654e] font-headline font-bold uppercase tracking-widest">онлайн</p>
            </div>
            <button onClick={endChat} className="ml-auto px-4 py-2 rounded-full text-xs font-headline font-bold text-[#924529] bg-[#f99774]/15 hover:bg-[#f99774]/30 transition-all">
              Завершить
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-surface-container-low/30">
            {decrypted.map((m) => (
              <div key={m.id} className={`flex items-end gap-2 ${m.senderType === 'anon' ? 'flex-row-reverse' : ''}`}>
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-surface-container-highest">
                  <span className="material-symbols-outlined msf text-xs text-on-surface-variant">{m.senderType === 'anon' ? 'mood' : 'volunteer_activism'}</span>
                </div>
                <div className={`rounded-xl p-3.5 max-w-[80%] shadow-sm ${m.senderType === 'anon' ? 'bg-[#fec24a]/40 rounded-br-none' : 'bg-white rounded-bl-none'}`}>
                  <p className="text-sm leading-relaxed text-[#322f22]">{m.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="glass sticky bottom-0 border-t border-amber-200/20">
            <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Напиши сообщение..."
                className="flex-1 bg-surface-container-low rounded-full px-5 py-3 text-sm text-[#322f22] font-body placeholder:text-[#5f5b4d]/50 focus:outline-none focus:ring-2 focus:ring-[#fec24a]"
              />
              <button onClick={handleSend} disabled={!input.trim()} className="w-11 h-11 rounded-full bg-gradient-to-br from-[#785500] to-[#fec24a] flex items-center justify-center shadow-md shadow-[#785500]/20 flex-shrink-0 hover:scale-105 active:scale-95 transition-all disabled:opacity-40">
                <span className="material-symbols-outlined msf text-white text-lg">send</span>
              </button>
            </div>
          </div>
        </main>
      )}

      {/* STEP: ended */}
      {step === 'ended' && (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white/60 backdrop-blur-xl rounded-[2rem] p-8 text-center space-y-6 shadow-2xl shadow-amber-900/10 border border-white">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#baeed1] flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-[#2a5b45]">check_circle</span>
            </div>
            <h1 className="font-headline text-2xl font-extrabold text-[#322f22]">Чат завершён</h1>
            <p className="text-[#5f5b4d] font-body text-sm">Спасибо, что доверился нам. Надеемся, стало легче 💛</p>

            {room?.volunteerId && !feedbackGiven && (
              <div className="space-y-3">
                <p className="text-sm font-headline font-bold text-[#322f22]">Как ты себя чувствуешь после разговора?</p>
                <div className="flex justify-center gap-4">
                  {[{ emoji: '😊', label: 'Лучше', v: 5 }, { emoji: '😐', label: 'Так же', v: 3 }, { emoji: '😔', label: 'Не помогло', v: 1 }].map((f) => (
                    <button key={f.v} onClick={() => giveFeedback(f.v)} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[#fec24a]/20 transition-all active:scale-90">
                      <span className="text-3xl">{f.emoji}</span>
                      <span className="text-xs text-[#5f5b4d] font-body">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={goHome} className="px-6 py-3 rounded-full font-headline font-bold text-sm bg-[#fec24a] text-[#5a3f00] hover:scale-105 transition-all">
              Вернуться на главную
            </button>
          </div>
        </main>
      )}
    </div>
  );



}
