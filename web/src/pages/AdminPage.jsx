import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { collection, query, where, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { db, login, getRole, watchAuth, logout } from '../lib/firebase.js';
import {
  approveUser, verifyVolunteer, deleteVolunteer, setup2FA, verify2FA, disable2FA, verifyAdmin2FA, downloadExport,
} from '../services/auth.js';

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [creds, setCreds] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [volunteers, setVolunteers] = useState([]);
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState({ rooms: 0, active: 0 });
  const [adminDoc, setAdminDoc] = useState(null);
  const [twoFAVerified, setTwoFAVerified] = useState(false);
  const [twoFASetup, setTwoFASetup] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');
  const navigate = useNavigate();

  useEffect(() => watchAuth(async (u) => {
    setUser(u);
    setRole(u ? await getRole(u) : null);
  }), []);

  useEffect(() => {
    setTwoFAVerified(false);
    setTwoFASetup(null);
    if (role !== 'admin' || !user) return undefined;
    return onSnapshot(doc(db, 'admins', user.uid), (s) => {
      setAdminDoc(s.exists() ? s.data() : null);
    });
  }, [role, user]);

  useEffect(() => {
    if (role !== 'admin') return undefined;
    const offVol = onSnapshot(
      query(collection(db, 'volunteers'), where('isVerified', '==', false)),
      (s) => setVolunteers(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const offUsers = onSnapshot(
      query(collection(db, 'users'), where('isApproved', '==', false)),
      (s) => setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const offRooms = onSnapshot(collection(db, 'chatRooms'), (s) => {
      let active = 0;
      s.docs.forEach((d) => { if (d.data().status === 'active') active++; });
      setStats({ rooms: s.size, active });
    });
    const offChats = onSnapshot(
      query(collection(db, 'chatRooms'), where('status', '==', 'active'), orderBy('createdAt', 'desc')),
      (s) => setChats(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const offAudit = onSnapshot(
      query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(50)),
      (s) => setAuditLogs(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return () => { offVol(); offUsers(); offRooms(); offChats(); offAudit(); };
  }, [role]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(creds.email, creds.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(id) {
    try { await verifyVolunteer(id, true); toast.success('Волонтёр подтверждён'); }
    catch (err) { toast.error(err.message); }
  }

  async function onApprove(id) {
    try { await approveUser(id); toast.success('Пользователь одобрен'); }
    catch (err) { toast.error(err.message); }
  }

  async function onDeleteVolunteer(id) {
    try { await deleteVolunteer(id); toast.success('Волонтёр удалён'); }
    catch (err) { toast.error(err.message); }
  }

  async function onExport() {
    try { await downloadExport(); toast.success('Экспорт начался'); }
    catch (err) { toast.error(err.message); }
  }

  async function onSetup2FA() {
    try { const res = await setup2FA(); setTwoFASetup(res.data); }
    catch (err) { toast.error(err.message); }
  }

  async function onVerify2FA() {
    try { await verify2FA(twoFACode); setTwoFACode(''); setTwoFASetup(null); toast.success('2FA включена'); }
    catch (err) { toast.error(err.message); }
  }

  async function onDisable2FA() {
    try { await disable2FA(); toast.success('2FA отключена'); }
    catch (err) { toast.error(err.message); }
  }

  async function onVerifyLogin2FA() {
    try { await verifyAdmin2FA(twoFACode); setTwoFACode(''); setTwoFAVerified(true); }
    catch (err) { toast.error(err.message); }
  }

  // __RENDER__

  if (!user) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex flex-col font-body">
        <header className="p-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#785500] font-headline font-bold hover:opacity-80"><span className="material-symbols-outlined">arrow_back</span>На главную</button>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl shadow-amber-900/10 border border-white">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#f99774] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-[#5a1c03]">shield_person</span>
              </div>
              <h1 className="text-2xl font-headline font-extrabold text-[#322f22]">Вход для администратора</h1>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-headline font-bold text-[#5f5b4d] mb-1 pl-4 uppercase tracking-wider">Email</label>
                <input type="email" placeholder="admin@echo.app" value={creds.email} onChange={(e) => setCreds({ ...creds, email: e.target.value })} className="w-full px-5 py-3 rounded-full bg-[#f8f0dc] border-none focus:ring-2 focus:ring-[#924529] text-sm text-[#322f22]" required />
              </div>
              <div>
                <label className="block text-xs font-headline font-bold text-[#5f5b4d] mb-1 pl-4 uppercase tracking-wider">Пароль</label>
                <input type="password" placeholder="Пароль" value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })} className="w-full px-5 py-3 rounded-full bg-[#f8f0dc] border-none focus:ring-2 focus:ring-[#924529] text-sm text-[#322f22]" required />
              </div>
              {error && <p className="text-sm text-[#b02500] font-body pl-2">{error}</p>}
              <button type="submit" disabled={busy} className="w-full py-4 bg-[#924529] text-white rounded-full font-headline font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[#924529]/20 disabled:opacity-70">
                {busy ? '…' : 'Войти'}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex flex-col font-body">
        <header className="p-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#785500] font-headline font-bold hover:opacity-80"><span className="material-symbols-outlined">arrow_back</span>На главную</button>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl shadow-amber-900/10 border border-white text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#f99774]/40 flex items-center justify-center"><span className="material-symbols-outlined text-3xl text-[#924529]">lock</span></div>
            <h1 className="text-2xl font-headline font-extrabold text-[#322f22]">Нет доступа</h1>
            <p className="text-sm text-[#5f5b4d] font-body">Этот аккаунт не имеет прав администратора.</p>
            <button onClick={logout} className="px-6 py-3 rounded-full font-headline font-bold text-sm bg-[#f8f0dc] text-[#322f22] hover:bg-[#efe8d2] transition-all">Выйти</button>
          </div>
        </main>
      </div>
    );
  }

  if (adminDoc?.isTwoFactorEnabled && !twoFAVerified) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex flex-col font-body">
        <header className="p-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#785500] font-headline font-bold hover:opacity-80"><span className="material-symbols-outlined">arrow_back</span>На главную</button>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl shadow-amber-900/10 border border-white text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#fec24a] flex items-center justify-center"><span className="material-symbols-outlined text-3xl text-[#5a3f00]">pin</span></div>
            <h1 className="text-2xl font-headline font-extrabold text-[#322f22]">Двухфакторная проверка</h1>
            <p className="text-sm text-[#5f5b4d] font-body">Введите 6-значный код из приложения-аутентификатора.</p>
            <input type="text" inputMode="numeric" maxLength={6} value={twoFACode} onChange={(e) => setTwoFACode(e.target.value)} placeholder="000000" className="w-full text-center tracking-[0.3em] font-mono font-bold text-xl py-3 bg-[#f8f0dc] rounded-xl focus:ring-2 focus:ring-[#785500] border-none" />
            <button onClick={onVerifyLogin2FA} className="w-full py-4 bg-[#785500] text-white rounded-full font-headline font-bold hover:brightness-110 active:scale-[0.98] transition-all">Проверить</button>
          </div>
        </main>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col font-body">
      <header className="glass sticky top-0 z-40 border-b border-amber-200/20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-headline font-extrabold text-lg text-[#322f22]">echo · админ</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#5f5b4d] font-body hidden sm:block">{user.email}</span>
            <button onClick={onExport} className="px-4 py-2 rounded-full text-xs font-headline font-bold text-[#34654e] bg-[#baeed1]/40 hover:bg-[#baeed1]/60 transition-all">Экспорт</button>
            <button onClick={logout} className="px-4 py-2 rounded-full text-xs font-headline font-bold text-[#5f5b4d] bg-white/70 hover:bg-white transition-all">Выйти</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Всего чатов', value: stats.rooms, icon: 'forum', color: '#785500' },
            { label: 'Активных сейчас', value: stats.active, icon: 'bolt', color: '#34654e' },
            { label: 'На проверке', value: volunteers.length, icon: 'pending', color: '#924529' },
          ].map((s) => (
            <div key={s.label} className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 border border-white shadow-amber-900/5">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: `${s.color}15` }}>
                <span className="material-symbols-outlined" style={{ color: s.color }}>{s.icon}</span>
              </div>
              <p className="text-3xl font-headline font-extrabold text-[#322f22]">{s.value}</p>
              <p className="text-xs text-[#5f5b4d] uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Security / 2FA */}
        <section className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white shadow-amber-900/5">
          <h2 className="font-headline font-extrabold text-[#322f22] mb-4">Безопасность</h2>
          {adminDoc?.isTwoFactorEnabled ? (
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-headline font-bold bg-[#baeed1] text-[#2a5b45]">2FA включена</span>
              <button onClick={onDisable2FA} className="px-4 py-2 rounded-full text-sm font-headline font-bold text-[#924529] bg-[#f99774]/15 hover:bg-[#f99774]/30 transition-all">Отключить</button>
            </div>
          ) : twoFASetup ? (
            <div className="space-y-3">
              <img src={twoFASetup.qrCode} alt="QR code" className="w-44 h-44 rounded-xl border-4 border-[#f8f0dc]" />
              <p className="text-sm text-[#5f5b4d] font-body">Секрет: <span className="font-mono">{twoFASetup.secret}</span></p>
              <div className="flex items-center gap-2 max-w-xs">
                <input type="text" maxLength={6} value={twoFACode} onChange={(e) => setTwoFACode(e.target.value)} placeholder="6 цифр" className="flex-1 px-4 py-2 rounded-full bg-[#f8f0dc] text-center font-mono text-lg border-none focus:ring-2 focus:ring-[#785500]" />
                <button onClick={onVerify2FA} className="px-5 py-2 rounded-full font-headline font-bold text-sm bg-[#785500] text-white hover:brightness-110 transition-all">Включить</button>
              </div>
            </div>
          ) : (
            <button onClick={onSetup2FA} className="px-6 py-3 rounded-full font-headline font-bold text-sm bg-[#f8f0dc] text-[#322f22] hover:bg-[#efe8d2] transition-all">
              Включить двухфакторную аутентификацию
            </button>
          )}
        </section>

        {/* Volunteers pending */}
        <section>
          <h2 className="font-headline font-extrabold text-[#322f22] mb-4">Волонтёры на проверке</h2>
          {volunteers.length === 0 ? (
            <p className="text-[#5f5b4d] font-body text-sm">Нет новых волонтёров.</p>
          ) : (
            <div className="space-y-3">
              {volunteers.map((v) => (
                <div key={v.id} className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 flex items-center gap-4 border border-white shadow-amber-900/5">
                  <div className="w-11 h-11 rounded-full bg-[#baeed1] flex items-center justify-center"><span className="material-symbols-outlined text-[#2a5b45]">person</span></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-bold text-[#322f22]">{v.displayName}</p>
                    <p className="text-sm text-[#5f5b4d] font-body truncate">{v.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onVerify(v.id)} className="px-5 py-2.5 rounded-full font-headline font-bold text-sm bg-[#34654e] text-white hover:brightness-110 transition-all">Подтвердить</button>
                    <button onClick={() => onDeleteVolunteer(v.id)} className="px-4 py-2.5 rounded-full font-headline font-bold text-sm text-[#924529] bg-[#f99774]/15 hover:bg-[#f99774]/30 transition-all">Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Users pending */}
        <section>
          <h2 className="font-headline font-extrabold text-[#322f22] mb-4">Пользователи на одобрении</h2>
          {users.length === 0 ? (
            <p className="text-[#5f5b4d] font-body text-sm">Нет заявок на постоянный аккаунт.</p>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 flex items-center gap-4 border border-white shadow-amber-900/5">
                  <div className="w-11 h-11 rounded-full bg-[#fec24a] flex items-center justify-center"><span className="material-symbols-outlined text-[#5a3f00]">person</span></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-bold text-[#322f22]">{u.nickname}</p>
                    <p className="text-sm text-[#5f5b4d] font-body truncate">{u.email}</p>
                  </div>
                  <button onClick={() => onApprove(u.id)} className="px-5 py-2.5 rounded-full font-headline font-bold text-sm bg-[#785500] text-white hover:brightness-110 transition-all">Одобрить</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Live chats */}
        <section>
          <h2 className="font-headline font-extrabold text-[#322f22] mb-4">Активные чаты</h2>
          {chats.length === 0 ? (
            <p className="text-[#5f5b4d] font-body text-sm">Нет активных чатов.</p>
          ) : (
            <div className="space-y-3">
              {chats.map((c) => (
                <div key={c.id} className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 flex items-center gap-4 border border-white shadow-amber-900/5">
                  <div className="w-11 h-11 rounded-full bg-[#baeed1] flex items-center justify-center"><span className="material-symbols-outlined text-[#2a5b45]">forum</span></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-bold text-[#322f22]">{c.anonNickname}</p>
                    <p className="text-sm text-[#5f5b4d] font-body truncate">{c.topic || 'Общее'} · {c.source}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-headline font-bold bg-[#baeed1] text-[#2a5b45]">активен</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Audit logs */}
        <section>
          <h2 className="font-headline font-extrabold text-[#322f22] mb-4">Журнал действий</h2>
          {auditLogs.length === 0 ? (
            <p className="text-[#5f5b4d] font-body text-sm">Логов пока нет.</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((a) => (
                <div key={a.id} className="bg-white/60 backdrop-blur-xl rounded-2xl px-4 py-3 flex items-center gap-3 border border-white">
                  <span className="text-xs font-headline font-bold text-[#785500] uppercase">{a.action}</span>
                  <span className="text-sm text-[#5f5b4d] font-body truncate flex-1">{a.target || a.details || ''}</span>
                  <span className="text-xs text-[#5f5b4d]/60 font-body">{a.timestamp?.toDate?.() ? a.timestamp.toDate().toLocaleString() : ''}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

