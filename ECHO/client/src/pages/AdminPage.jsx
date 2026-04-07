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
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [stats, setStats] = useState({
    volunteers: 0,
    verifiedVolunteers: 0,
    totalRooms: 0,
    activeRooms: 0,
    averageRating: 0
  });
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

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
        toast.error(data.message || 'Ошибка входа');
      }
    } catch (err) {
      toast.error('Ошибка соединения с сервером');
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
            <button 
              type="submit"
              className="w-full py-4 bg-[#785500] text-white rounded-full font-headline font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[#785500]/20"
            >
              Войти
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
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-full bg-[#785500] text-white font-headline font-bold text-sm shadow-lg shadow-[#785500]/20">
            <span className="material-symbols-outlined text-lg">dashboard</span> Дашборд
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-full text-[#5f5b4d] hover:bg-[#f8f0dc] transition-all font-medium text-sm">
            <span className="material-symbols-outlined text-lg">group</span> Волонтёры
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-full text-[#5f5b4d] hover:bg-[#f8f0dc] transition-all font-medium text-sm">
            <span className="material-symbols-outlined text-lg">chat_bubble</span> Чаты
          </a>
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
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-headline font-extrabold text-[#322f22]">Дашборд</h1>
            <p className="text-[#5f5b4d] text-sm mt-1">Система работает в штатном режиме</p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#baeed1] rounded-full">
            <div className="w-2 h-2 rounded-full bg-[#2a5b45] animate-pulse"></div>
            <span className="text-[10px] uppercase font-headline font-bold text-[#2a5b45] tracking-widest">AES-256 Защита</span>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard title="Активные чаты" value={stats.activeRooms} icon="forum" trend="+12%" color="#785500" />
          <StatCard title="Волонтёры" value={stats.volunteers} icon="volunteer_activism" trend="Online" color="#34654e" />
          <StatCard title="Ожидают" value={stats.volunteers - stats.verifiedVolunteers} icon="pending_actions" color="#b02500" />
          <StatCard title="Рейтинг" value={stats.averageRating.toFixed(1)} icon="star" color="#fec24a" />
        </div>

        {/* Volunteer Table */}
        <section className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-6 shadow-xl shadow-amber-900/5 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-headline font-extrabold">Управление волонтёрами</h2>
            <button className="p-2 rounded-full hover:bg-[#f8f0dc] text-[#5f5b4d]">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
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
                    <td className="py-4 text-right pr-4">
                      <button 
                        onClick={() => handleVerify(v.id, v.isVerified)}
                        className={`p-2 rounded-lg ${v.isVerified ? 'text-[#b02500] hover:bg-[#b02500]/10' : 'text-[#34654e] hover:bg-[#34654e]/10'} transition-all`}
                        title={v.isVerified ? 'Revoke' : 'Verify'}
                      >
                        <span className="material-symbols-outlined italic">
                          {v.isVerified ? 'block' : 'verified'}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
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
