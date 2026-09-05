import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth, login, register, getRole, watchAuth, logout } from '../lib/firebase.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { watchQueue, acceptRoom, watchMessages, sendMessage, closeRoom, getRoom } from '../services/chat.js';

export default function VolunteerPage() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [view, setView] = useState('login'); // login | register | pending | dashboard | chatting
  const [creds, setCreds] = useState({ email: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [queue, setQueue] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [decrypted, setDecrypted] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => watchAuth(async (u) => {
    setUser(u);
    setRole(u ? await getRole(u) : null);
    if (u && await getRole(u) === 'volunteer') setView('dashboard');
  }), []);

  useEffect(() => {
    if (role !== 'volunteer') return undefined;
    return watchQueue(setQueue);
  }, [role]);

  useEffect(() => {
    if (!activeRoom?.id) return undefined;
    return watchMessages(activeRoom.id, setMessages);
  }, [activeRoom?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeRoom?.encryptionKey) { setDecrypted([]); return; }
      const out = await Promise.all(messages.map(async (m) => ({
        id: m.id,
        senderType: m.senderType,
        createdAt: m.createdAt,
        text: await decrypt(m.content, m.iv, activeRoom.encryptionKey).catch(() => '[не расшифровано]'),
      })));
      if (!cancelled) setDecrypted(out);
    })();
    return () => { cancelled = true; };
  }, [messages, activeRoom?.encryptionKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [decrypted]);

  async function handleAuth(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (view === 'register') {
        const cred = await register(creds.email, creds.password);
        await setDoc(doc(db, 'volunteers', cred.user.uid), {
          username: creds.email,
          displayName: creds.displayName || creds.email,
          email: creds.email,
          isVerified: false,
          isOnline: false,
          rating: 5.0,
          level: 1,
          hoursCount: 0,
          totalChats: 0,
          createdAt: new Date(),
        });
        toast.success('Заявка отправлена! Ожидайте подтверждения администратором.');
        setView('pending');
      } else {
        await login(creds.email, creds.password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept(roomId) {
    try {
      await acceptRoom(roomId, { volunteerId: user.uid, volunteerName: user.email });
      setActiveRoom(await getRoom(roomId));
      setView('chatting');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !activeRoom?.encryptionKey) return;
    setInput('');
    try {
      const { content, iv } = await encrypt(text, activeRoom.encryptionKey);
      await sendMessage(activeRoom.id, { content, iv, senderType: 'volunteer' });
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleClose() {
    try {
      await closeRoom(activeRoom.id);
      setActiveRoom(null);
      setView('dashboard');
    } catch (err) {
      toast.error(err.message);
    }
  }

  // __RENDER__

  // Chat view (after accepting)
  if (view === 'chatting' && activeRoom) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex flex-col font-body">
        <header className="glass sticky top-0 z-40 border-b border-amber-200/20">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#785500] font-headline font-bold hover:opacity-80">
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="font-headline font-extrabold text-lg text-[#322f22]">echo</span>
            </button>
            <button onClick={handleClose} className="px-4 py-2 rounded-full text-xs font-headline font-bold text-[#924529] bg-[#f99774]/15 hover:bg-[#f99774]/30 transition-all">Завершить</button>
          </div>
        </header>
        <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto">
          <div className="px-4 py-3 flex items-center gap-3 bg-white/60 border-b border-amber-200/20">
            <div className="w-10 h-10 rounded-full bg-[#fec24a] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#5a3f00]">mood</span>
            </div>
            <div>
              <p className="font-headline font-bold text-sm text-[#322f22]">{activeRoom.anonNickname}</p>
              <p className="text-xs text-[#785500] font-headline font-bold uppercase tracking-widest">{activeRoom.mood} · {activeRoom.topic || 'Общее'}</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-surface-container-low/30">
            {decrypted.map((m) => (
              <div key={m.id} className={`flex items-end gap-2 ${m.senderType === 'volunteer' ? 'flex-row-reverse' : ''}`}>
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-surface-container-highest">
                  <span className="material-symbols-outlined msf text-xs text-on-surface-variant">{m.senderType === 'volunteer' ? 'volunteer_activism' : 'mood'}</span>
                </div>
                <div className={`rounded-xl p-3.5 max-w-[80%] shadow-sm ${m.senderType === 'volunteer' ? 'bg-[#baeed1]/60 rounded-br-none' : 'bg-white rounded-bl-none'}`}>
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
                placeholder="Напиши ответ..."
                className="flex-1 bg-surface-container-low rounded-full px-5 py-3 text-sm text-[#322f22] font-body placeholder:text-[#5f5b4d]/50 focus:outline-none focus:ring-2 focus:ring-[#baeed1]"
              />
              <button onClick={handleSend} disabled={!input.trim()} className="w-11 h-11 rounded-full bg-gradient-to-br from-[#34654e] to-[#baeed1] flex items-center justify-center shadow-md shadow-[#34654e]/20 flex-shrink-0 hover:scale-105 active:scale-95 transition-all disabled:opacity-40">
                <span className="material-symbols-outlined msf text-white text-lg">send</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Pending approval view
  if (user && role !== 'volunteer') {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex flex-col font-body">
        <header className="p-6"><button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#785500] font-headline font-bold hover:opacity-80"><span className="material-symbols-outlined">arrow_back</span>На главную</button></header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl shadow-amber-900/10 border border-white text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#fec24a] flex items-center justify-center"><span className="material-symbols-outlined text-3xl text-[#5a3f00]">pending</span></div>
            <h1 className="text-2xl font-headline font-extrabold text-[#322f22]">Ожидание подтверждения</h1>
            <p className="text-sm text-[#5f5b4d] font-body">Ваш аккаунт волонтёра ожидает проверки администратором. После одобрения вы сможете принимать чаты.</p>
            <button onClick={logout} className="px-6 py-3 rounded-full font-headline font-bold text-sm bg-[#f8f0dc] text-[#322f22] hover:bg-[#efe8d2] transition-all">Выйти</button>
          </div>
        </main>
      </div>
    );
  }

  // Login / register
  if (!user) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex flex-col font-body">
        <header className="p-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#785500] font-headline font-bold hover:opacity-80"><span className="material-symbols-outlined">arrow_back</span>На главную</button>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl shadow-amber-900/10 border border-white">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#baeed1] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-[#2a5b45]">volunteer_activism</span>
              </div>
              <h1 className="text-2xl font-headline font-extrabold text-[#322f22]">{view === 'register' ? 'Стать волонтёром' : 'Вход для волонтёров'}</h1>
              <p className="text-sm text-[#5f5b4d] mt-2">{view === 'register' ? 'Создайте аккаунт и помогайте подросткам' : 'Войдите, чтобы принимать заявки'}</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              {view === 'register' && (
                <div>
                  <label className="block text-xs font-headline font-bold text-[#5f5b4d] mb-1 pl-4 uppercase tracking-wider">Имя</label>
                  <input type="text" placeholder="Как вас зовут" value={creds.displayName} onChange={(e) => setCreds({ ...creds, displayName: e.target.value })} className="w-full px-5 py-3 rounded-full bg-[#f8f0dc] border-none focus:ring-2 focus:ring-[#34654e] text-sm text-[#322f22]" required />
                </div>
              )}
              <div>
                <label className="block text-xs font-headline font-bold text-[#5f5b4d] mb-1 pl-4 uppercase tracking-wider">Email</label>
                <input type="email" placeholder="you@example.com" value={creds.email} onChange={(e) => setCreds({ ...creds, email: e.target.value })} className="w-full px-5 py-3 rounded-full bg-[#f8f0dc] border-none focus:ring-2 focus:ring-[#34654e] text-sm text-[#322f22]" required />
              </div>
              <div>
                <label className="block text-xs font-headline font-bold text-[#5f5b4d] mb-1 pl-4 uppercase tracking-wider">Пароль</label>
                <input type="password" placeholder="Ваш пароль" value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })} className="w-full px-5 py-3 rounded-full bg-[#f8f0dc] border-none focus:ring-2 focus:ring-[#34654e] text-sm text-[#322f22]" required />
              </div>
              {error && <p className="text-sm text-[#b02500] font-body pl-2">{error}</p>}
              <button type="submit" disabled={busy} className="mt-2 w-full py-4 bg-[#34654e] text-white rounded-full font-headline font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[#34654e]/20 disabled:opacity-70">
                {busy ? '…' : (view === 'register' ? 'Зарегистрироваться' : 'Войти')}
              </button>
            </form>
            <div className="mt-6 text-center">
              <button onClick={() => { setView(view === 'register' ? 'login' : 'register'); setError(''); }} className="text-sm font-bold text-[#34654e] hover:underline">
                {view === 'register' ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Стать волонтёром'}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Dashboard (queue)
  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col font-body">
      <header className="glass sticky top-0 z-40 border-b border-amber-200/20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-headline font-extrabold text-lg text-[#322f22]">echo</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#5f5b4d] font-body hidden sm:block">{user.email}</span>
            <button onClick={logout} className="px-4 py-2 rounded-full text-xs font-headline font-bold text-[#5f5b4d] bg-white/70 hover:bg-white transition-all">Выйти</button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto p-6">
        <div className="mb-8">
          <span className="text-xs font-headline font-black uppercase tracking-[0.2em] text-[#34654e]">Панель волонтёра</span>
          <h1 className="font-headline text-3xl font-extrabold text-[#322f22] mt-2">Заявки ожидающие ответа</h1>
        </div>
        {queue.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-12 text-center border border-white shadow-amber-900/5">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#baeed1]/50 flex items-center justify-center mb-4"><span className="material-symbols-outlined text-3xl text-[#2a5b45]">inbox</span></div>
            <p className="text-[#5f5b4d] font-body">Пока нет новых заявок. Отдохните — мы сообщим, когда кто-то обратится.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((r) => (
              <div key={r.id} className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 flex items-center gap-4 border border-white shadow-amber-900/5">
                <div className="w-12 h-12 rounded-full bg-[#fec24a]/30 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#5a3f00]">mood</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-headline font-bold text-[#322f22]">{r.anonNickname}</p>
                  <p className="text-sm text-[#5f5b4d] font-body truncate">{r.mood} · {r.topic || 'Общее'}</p>
                </div>
                <button onClick={() => handleAccept(r.id)} className="px-6 py-3 rounded-full font-headline font-bold text-sm bg-gradient-to-br from-[#34654e] to-[#baeed1] text-white shadow-lg shadow-[#34654e]/20 hover:scale-105 active:scale-95 transition-all">
                  Принять
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
