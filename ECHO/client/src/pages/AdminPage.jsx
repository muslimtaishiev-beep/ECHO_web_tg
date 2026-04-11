import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// ----------------------------------------------------------------------------
// API Config
// ----------------------------------------------------------------------------
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('admin_token'));
  const [loginData, setLoginData] = useState({ username: '', password: '', totpCode: '' });
  const [show2FAInput, setShow2FAInput] = useState(false);
  const [setup2FAData, setSetup2FAData] = useState(null); // { qrCode, secret }
  const [verify2FACode, setVerify2FACode] = useState('');
  const [stats, setStats] = useState({
    volunteers: 0,
    verifiedVolunteers: 0,
    totalRooms: 0,
    activeRooms: 0,
    averageRating: 0
  });
  const [volunteers, setVolunteers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [chats, setChats] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [auditFilter, setAuditFilter] = useState({ search: '', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      if (currentView === 'dashboard' || currentView === 'volunteers') {
        fetchDashboardData();
      } else if (currentView === 'audit') {
        fetchAuditLogs();
      } else if (currentView === 'chats') {
        fetchChats();
      } else if (currentView === 'users') {
        fetchPendingUsers();
      }
    }
  }, [isAuthenticated, currentView]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
      };
      
      const [statsRes, volRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers }),
        fetch(`${API_URL}/admin/volunteers`, { headers })
      ]);

      if (statsRes.status === 401) {
        handleLogout();
        return;
      }

      const statsData = await statsRes.json();
      const volData = await volRes.json();

      setStats(statsData);
      setVolunteers(volData);
    } catch (err) {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (auditFilter.search) query.append('search', auditFilter.search);
      if (auditFilter.startDate) query.append('startDate', auditFilter.startDate);
      if (auditFilter.endDate) query.append('endDate', auditFilter.endDate);
      
      const res = await fetch(`${API_URL}/admin/audit-logs?${query.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAuditLogs(data);
    } catch (err) {
      toast.error('Ошибка загрузки логов аудита');
    } finally {
      setLoading(false);
    }
  };

  const fetchChats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/chats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setChats(data);
    } catch (err) {
      toast.error('Ошибка загрузки чатов');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/pending`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPendingUsers(data);
    } catch (err) {
      toast.error('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('admin_token', data.access_token);
        setIsAuthenticated(true);
        toast.success('Добро пожаловать, админ!');
      } else {
        if (data.message === '2FA code required') {
          setShow2FAInput(true);
          toast('Требуется код 2FA', { icon: '🔐' });
        } else {
          toast.error(data.message || 'Ошибка входа');
        }
      }
    } catch (err) {
      toast.error('Ошибка соединения с сервером');
    }
  };

  const handleSetup2FA = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/setup-2fa`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSetup2FAData({ qrCode: data.qrCode, secret: data.secret });
      } else {
        toast.error('Ошибка создания 2FA');
      }
    } catch (err) {
      toast.error('Ошибка соединения с сервером');
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/verify-2fa`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: verify2FACode })
      });
      if (res.ok) {
        toast.success('2FA успешно включена!');
        setSetup2FAData(null);
      } else {
        const errData = await res.json();
        toast.error(errData.message || 'Неверный код');
      }
    } catch (err) {
      toast.error('Ошибка при верификации 2FA');
    }
  };

  const handleExport = async (format) => {
    try {
      const toastId = toast.loading('Генерация экспорта...');
      const res = await fetch(`${API_URL}/admin/export?format=${format}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (!res.ok) throw new Error('Export default');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ECHO_export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Экспорт завершен', { id: toastId });
    } catch (err) {
      toast.error('Ошибка при скачивании', { id: toastId });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    navigate('/admin');
  };

  const handleVerify = async (id, currentStatus) => {
    try {
      const res = await fetch(`${API_URL}/admin/volunteers/${id}/verify`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isVerified: !currentStatus })
      });
      if (res.ok) {
        toast.success(currentStatus ? 'Верификация снята' : 'Волонтёр подтверждён');
        fetchDashboardData();
      }
    } catch (err) {
      toast.error('Ошибка при верификации');
    }
  };

  const handleDeleteVolunteer = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить волонтёра? Это действие необратимо.')) return;
    try {
      const res = await fetch(`${API_URL}/admin/volunteers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      if (res.ok) {
        toast.success('Волонтёр удалён');
        fetchDashboardData();
      } else {
        toast.error('Ошибка при удалении');
      }
    } catch (err) {
      toast.error('Ошибка сервера');
    }
  };

  const handleApproveUser = async (id) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      if (res.ok) {
        toast.success('Пользователь одобрен и ID сгенерирован');
        fetchPendingUsers();
      } else {
        toast.error('Ошибка при одобрении пользователя');
      }
    } catch (err) {
      toast.error('Ошибка сервера');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center p-4 font-body">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl shadow-amber-900/10 border border-white"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#fec24a] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#5a3f00] text-3xl">admin_panel_settings</span>
            </div>
            <h1 className="text-2xl font-headline font-extrabold text-[#322f22]">ECHO Admin</h1>
            <p className="text-sm text-[#5f5b4d]">Вход в панель управления</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {!show2FAInput ? (
              <>
                <div>
                  <label className="block text-xs font-headline font-bold text-[#5f5b4d] mb-1 pl-4 uppercase tracking-wider">Логин</label>
                  <input 
                    type="text"
                    className="w-full px-5 py-3 rounded-full bg-[#f8f0dc] border-none focus:ring-2 focus:ring-[#785500] text-sm text-[#322f22]"
                    value={loginData.username}
                    onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-headline font-bold text-[#5f5b4d] mb-1 pl-4 uppercase tracking-wider">Пароль</label>
                  <input 
                    type="password"
                    className="w-full px-5 py-3 rounded-full bg-[#f8f0dc] border-none focus:ring-2 focus:ring-[#785500] text-sm text-[#322f22]"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    required
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-headline font-bold text-[#5f5b4d] mb-1 pl-4 uppercase tracking-wider">Код 2FA (TOTP)</label>
                <input 
                  type="text"
                  placeholder="000000"
                  className="w-full px-5 py-3 rounded-full bg-[#f8f0dc] border-none focus:ring-2 focus:ring-[#785500] text-sm text-[#322f22] text-center tracking-[0.2em] font-mono text-lg"
                  value={loginData.totpCode}
                  onChange={(e) => setLoginData({...loginData, totpCode: e.target.value})}
                  required
                />
              </div>
            )}
            <button 
              type="submit"
              className="w-full py-4 bg-[#785500] text-white rounded-full font-headline font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[#785500]/20"
            >
              {show2FAInput ? 'Подтвердить вход' : 'Войти'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3] font-body text-[#322f22] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white/40 backdrop-blur-md p-6 flex flex-col border-r border-[#efe8d2]">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-full bg-[#fec24a] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#5a3f00] text-sm">self_improvement</span>
          </div>
          <span className="font-headline font-extrabold text-xl tracking-tight">ECHO Admin</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full font-medium text-sm transition-all ${currentView === 'dashboard' ? 'bg-[#785500] text-white shadow-lg shadow-[#785500]/20 font-bold' : 'text-[#5f5b4d] hover:bg-[#f8f0dc]'}`}
          >
            <span className="material-symbols-outlined text-lg">dashboard</span> Дашборд
          </button>
          <button 
            onClick={() => setCurrentView('volunteers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full font-medium text-sm transition-all ${currentView === 'volunteers' ? 'bg-[#785500] text-white shadow-lg shadow-[#785500]/20 font-bold' : 'text-[#5f5b4d] hover:bg-[#f8f0dc]'}`}
          >
            <span className="material-symbols-outlined text-lg">group</span> Волонтёры
          </button>
          <button 
            onClick={() => setCurrentView('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full font-medium text-sm transition-all ${currentView === 'users' ? 'bg-[#785500] text-white shadow-lg shadow-[#785500]/20 font-bold' : 'text-[#5f5b4d] hover:bg-[#f8f0dc]'}`}
          >
            <span className="material-symbols-outlined text-lg">how_to_reg</span> Заявки (Users)
          </button>
          <button 
            onClick={() => setCurrentView('audit')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full font-medium text-sm transition-all ${currentView === 'audit' ? 'bg-[#785500] text-white shadow-lg shadow-[#785500]/20 font-bold' : 'text-[#5f5b4d] hover:bg-[#f8f0dc]'}`}
          >
            <span className="material-symbols-outlined text-lg">manage_search</span> Логи Аудита
          </button>
          <button onClick={handleSetup2FA} className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-[#5f5b4d] hover:bg-[#f8f0dc] transition-all font-medium text-sm">
            <span className="material-symbols-outlined text-lg">security</span> Настроить 2FA
          </button>
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto py-3 px-6 rounded-full bg-[#b02500]/10 text-[#b02500] font-headline font-bold text-sm hover:bg-[#b02500]/20 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">logout</span> Выход
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 space-y-8 overflow-y-auto max-h-screen">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-headline font-extrabold text-[#322f22]">
              {currentView === 'dashboard' && 'Дашборд'}
              {currentView === 'volunteers' && 'Волонтёры'}
              {currentView === 'users' && 'Заявки Пользователей'}
              {currentView === 'audit' && 'Аудит и Настройки'}
            </h1>
            <p className="text-[#5f5b4d] text-sm mt-1">Система работает в штатном режиме</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-white/60 border border-[#efe8d2] rounded-full text-xs font-bold text-[#5f5b4d] hover:bg-white transition-all shadow-sm flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">download</span> CSV
            </button>
            <button 
              onClick={() => handleExport('json')}
              className="px-4 py-2 bg-white/60 border border-[#efe8d2] rounded-full text-xs font-bold text-[#5f5b4d] hover:bg-white transition-all shadow-sm flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">download</span> JSON
            </button>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#baeed1] rounded-full ml-2">
              <div className="w-2 h-2 rounded-full bg-[#2a5b45] animate-pulse"></div>
              <span className="text-[10px] uppercase font-headline font-bold text-[#2a5b45] tracking-widest">AES-256 Защита</span>
            </div>
          </div>
        </header>

        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard title="Активные чаты" value={stats.activeRooms} icon="forum" trend="+12%" color="#785500" />
            <StatCard title="Волонтёры" value={stats.volunteers} icon="volunteer_activism" trend="Online" color="#34654e" />
            <StatCard title="Ожидают" value={stats.volunteers - stats.verifiedVolunteers} icon="pending_actions" color="#b02500" />
            <StatCard title="Рейтинг" value={stats.averageRating.toFixed(1)} icon="star" color="#fec24a" />
          </div>
        )}

        {/* Volunteers View */}
        {(currentView === 'dashboard' || currentView === 'volunteers') && (
          <section className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-6 shadow-xl shadow-amber-900/5 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-headline font-extrabold">Управление волонтёрами</h2>
            </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-[#5f5b4d] border-b border-[#efe8d2]">
                  <th className="pb-4 pl-4 font-bold">Волонтёр</th>
                  <th className="pb-4 font-bold">Telegram ID</th>
                  <th className="pb-4 font-bold">Статус</th>
                  <th className="pb-4 font-bold">Рейтинг</th>
                  <th className="pb-4 text-right pr-4 font-bold">Действия</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {volunteers.map((v) => (
                  <tr key={v.id} className="group hover:bg-[#f8f0dc]/50 transition-all border-b border-[#efe8d2]/50">
                    <td className="py-4 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#fec24a] flex items-center justify-center font-bold text-[10px] text-[#5a3f00]">
                          {v.displayName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-headline font-bold text-[#322f22]">{v.displayName}</p>
                          <p className="text-[10px] text-[#5f5b4d]">@{v.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 font-mono text-xs text-[#5f5b4d]">{v.telegramId?.toString() || '—'}</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${v.isVerified ? 'bg-[#baeed1] text-[#2a5b45]' : 'bg-[#fff1de] text-[#785500]'}`}>
                        {v.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-4 font-bold text-[#322f22]">{v.rating.toFixed(1)}</td>
                    <td className="py-4 text-right pr-4 flex justify-end gap-2">
                      <button 
                        onClick={() => handleVerify(v.id, v.isVerified)}
                        className={`p-2 rounded-lg ${v.isVerified ? 'text-[#b02500] hover:bg-[#b02500]/10' : 'text-[#34654e] hover:bg-[#34654e]/10'} transition-all`}
                        title={v.isVerified ? 'Заблокировать' : 'Одобрить'}
                      >
                        <span className="material-symbols-outlined italic">
                          {v.isVerified ? 'block' : 'verified'}
                        </span>
                      </button>
                      <button 
                        onClick={() => handleDeleteVolunteer(v.id)}
                        className="p-2 rounded-lg text-[#b02500] hover:bg-[#b02500]/10 transition-all focus:outline-none"
                        title="Удалить"
                      >
                        <span className="material-symbols-outlined">delete_forever</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        )}

        {/* Users View */}
        {currentView === 'users' && (
          <section className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-6 shadow-xl shadow-amber-900/5 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-headline font-extrabold">Заявки пользователей на постоянный аккаунт</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-[#5f5b4d] border-b border-[#efe8d2]">
                    <th className="pb-4 pl-4 font-bold">Никнейм</th>
                    <th className="pb-4 font-bold">Зарегистрирован</th>
                    <th className="pb-4 text-right pr-4 font-bold">Одобрить</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {pendingUsers.length > 0 ? pendingUsers.map((u) => (
                    <tr key={u.id} className="group hover:bg-[#f8f0dc]/50 transition-all border-b border-[#efe8d2]/50">
                      <td className="py-4 pl-4 font-bold text-[#322f22]">
                        {u.nickname}
                      </td>
                      <td className="py-4 text-xs text-[#5f5b4d]">{new Date(u.createdAt).toLocaleString()}</td>
                      <td className="py-4 text-right pr-4">
                        <button 
                          onClick={() => handleApproveUser(u.id)}
                          className="px-4 py-2 bg-[#785500] text-white rounded-full text-xs font-bold shadow hover:brightness-110 transition-all"
                        >
                          Одобрить
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-[#5f5b4d]">Нет ожидающих заявок</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Chats View */}
        {currentView === 'chats' && (
          <section className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-6 shadow-xl shadow-amber-900/5 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-headline font-extrabold">Управление чатами</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-[#5f5b4d] border-b border-[#efe8d2]">
                    <th className="pb-4 pl-4 font-bold">Тема / ID</th>
                    <th className="pb-4 font-bold">Аноним</th>
                    <th className="pb-4 font-bold">Волонтёр</th>
                    <th className="pb-4 font-bold">Статус</th>
                    <th className="pb-4 font-bold">Источник</th>
                    <th className="pb-4 font-bold">Создан</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {chats.length > 0 ? chats.map((chat) => (
                    <tr key={chat.id} className="group hover:bg-[#f8f0dc]/50 transition-all border-b border-[#efe8d2]/50">
                      <td className="py-4 pl-4">
                        <p className="font-headline font-bold text-[#322f22]">{chat.topic}</p>
                        <p className="text-[10px] font-mono text-[#5f5b4d]">{chat.id.substring(0, 8)}...</p>
                      </td>
                      <td className="py-4 font-bold text-[#34654e]">{chat.anonNickname}</td>
                      <td className="py-4 text-[#5f5b4d]">{chat.volunteer?.displayName || '—'}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          chat.status === 'active' ? 'bg-[#baeed1] text-[#2a5b45]' : 
                          chat.status === 'closed' ? 'bg-gray-200 text-gray-700' : 'bg-[#fff1de] text-[#785500]'
                        }`}>
                          {chat.status}
                        </span>
                      </td>
                      <td className="py-4 text-xs tracking-wider uppercase text-[#5f5b4d]">{chat.source}</td>
                      <td className="py-4 text-xs text-[#5f5b4d]">{new Date(chat.createdAt).toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-[#5f5b4d]">Нет активных чатов</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Audit View */}
        {currentView === 'audit' && (
          <section className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-6 shadow-xl shadow-amber-900/5 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <h2 className="text-xl font-headline font-extrabold">Логи Аудита</h2>
              <div className="flex flex-col md:flex-row gap-2">
                <input 
                  type="date"
                  className="px-4 py-2 rounded-full bg-white border border-[#efe8d2] text-sm focus:ring-2 focus:ring-[#785500] outline-none"
                  value={auditFilter.startDate}
                  onChange={(e) => setAuditFilter({ ...auditFilter, startDate: e.target.value })}
                />
                <input 
                  type="date"
                  className="px-4 py-2 rounded-full bg-white border border-[#efe8d2] text-sm focus:ring-2 focus:ring-[#785500] outline-none"
                  value={auditFilter.endDate}
                  onChange={(e) => setAuditFilter({ ...auditFilter, endDate: e.target.value })}
                />
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Поиск логов..."
                    className="px-4 py-2 pr-10 rounded-full bg-white border border-[#efe8d2] text-sm focus:ring-2 focus:ring-[#785500] outline-none w-full md:w-48"
                    value={auditFilter.search}
                    onChange={(e) => setAuditFilter({ ...auditFilter, search: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && fetchAuditLogs()}
                  />
                  <button onClick={fetchAuditLogs} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#785500]">
                    <span className="material-symbols-outlined text-[20px]">search</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-[#5f5b4d] border-b border-[#efe8d2]">
                    <th className="pb-4 pl-4 font-bold">Время</th>
                    <th className="pb-4 font-bold">Действие</th>
                    <th className="pb-4 font-bold">Объект</th>
                    <th className="pb-4 font-bold">Детали</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {auditLogs.length > 0 ? auditLogs.map((log) => (
                    <tr key={log.id} className="group hover:bg-[#f8f0dc]/50 transition-all border-b border-[#efe8d2]/50">
                      <td className="py-4 pl-4 text-xs text-[#5f5b4d]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-4 font-bold text-[#322f22]">
                        <span className="px-3 py-1 rounded-full text-[10px] bg-[#f8f0dc] text-[#785500]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-4 font-mono text-xs text-[#5f5b4d]">{log.target || '—'}</td>
                      <td className="py-4 text-[#5f5b4d] text-xs">{log.details || '—'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-[#5f5b4d]">Нет логов для отображения</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* 2FA Setup Modal */}
      <AnimatePresence>
        {setup2FAData && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setSetup2FAData(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-[#baeed1] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-[#2a5b45]">qr_code_scanner</span>
                </div>
                <h3 className="text-xl font-headline font-extrabold text-[#322f22] mb-2">Настройка 2FA</h3>
                <p className="text-sm text-[#5f5b4d] mb-6">
                  Отсканируйте этот QR-код в Google Authenticator.
                </p>
                
                <img src={setup2FAData.qrCode} alt="QR Code" className="mx-auto border-4 border-gray-100 rounded-xl mb-4" />
                
                <form onSubmit={handleVerify2FA} className="mt-6 space-y-4">
                  <input 
                    type="text" 
                    placeholder="Введите 6 цифр" 
                    className="w-full text-center tracking-[0.3em] font-mono font-bold text-xl py-3 bg-[#f8f0dc] rounded-xl focus:ring-2 focus:ring-[#785500] border-none"
                    value={verify2FACode}
                    onChange={(e) => setVerify2FACode(e.target.value)}
                    maxLength={6}
                    required
                  />
                  <button type="submit" className="w-full py-4 bg-[#785500] text-white font-headline font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all">
                    Подтвердить и Включить
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white/80 p-5 rounded-[2rem] shadow shadow-amber-900/5 border border-white"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-2xl" style={{ backgroundColor: `${color}15` }}>
          <span className="material-symbols-outlined" style={{ color: color }}>{icon}</span>
        </div>
        {trend && (
          <span className="text-[10px] font-bold px-2 py-1 bg-[#baeed1] text-[#2a5b45] rounded-full">{trend}</span>
        )}
      </div>
      <p className="text-3xl font-headline font-extrabold text-[#322f22]">{value}</p>
      <p className="text-[#5f5b4d] text-xs font-medium uppercase tracking-wider">{title}</p>
    </motion.div>
  );
}
