import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export default function RegisterUserPage() {
  const [formData, setFormData] = useState({ nickname: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Заявка на постоянный аккаунт отправлена! Ожидайте одобрения.');
        navigate('/status');
      } else {
        toast.error(data.message || 'Ошибка регистрации');
      }
    } catch (err) {
      toast.error('Сбой сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col font-body">
      <header className="p-6">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[#785500] font-headline font-bold hover:opacity-80 transition-opacity"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          На главную
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl shadow-amber-900/10 border border-white"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-headline font-extrabold text-[#322f22]">Создать постоянный аккаунт</h1>
            <p className="text-sm text-[#5f5b4d] mt-2">Зарегистрируйтесь, чтобы сохранять историю чатов</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-headline font-bold text-[#5f5b4d] mb-1 pl-4 uppercase tracking-wider">Никнейм</label>
              <input 
                type="text"
                placeholder="Придумайте никнейм"
                className="w-full px-5 py-3 rounded-full bg-[#f8f0dc] border-none focus:ring-2 focus:ring-[#785500] text-sm text-[#322f22]"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-headline font-bold text-[#5f5b4d] mb-1 pl-4 uppercase tracking-wider">Пароль</label>
              <input 
                type="password"
                placeholder="Придумайте пароль"
                className="w-full px-5 py-3 rounded-full bg-[#f8f0dc] border-none focus:ring-2 focus:ring-[#785500] text-sm text-[#322f22]"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="mt-6 w-full py-4 bg-[#785500] text-white rounded-full font-headline font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[#785500]/20 disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {loading ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#5f5b4d]">
              Уже есть заявка?{' '}
              <Link to="/status" className="font-bold text-[#785500] hover:underline">
                Проверить статус
              </Link>
            </p>
            <p className="text-sm text-[#5f5b4d] mt-2">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="font-bold text-[#785500] hover:underline">
                Войти
              </Link>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
