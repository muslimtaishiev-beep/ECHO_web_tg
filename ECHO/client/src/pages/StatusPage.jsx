import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export default function StatusPage() {
  const [formData, setFormData] = useState({ nickname: '', password: '' });
  const [statusResult, setStatusResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCheck = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusResult(null);
    try {
      const res = await fetch(`${API_URL}/auth/user/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusResult(data);
        if (data.status === 'approved') {
          toast.success('Аккаунт одобрен!');
        } else {
          toast.success('Аккаунт на рассмотрении');
        }
      } else {
        toast.error(data.message || 'Ошибка проверки статуса');
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl shadow-amber-900/10 border border-white"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#baeed1] rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <span className="material-symbols-outlined text-[#2a5b45] text-3xl">fact_check</span>
            </div>
            <h1 className="text-2xl font-headline font-extrabold text-[#322f22]">Проверка статуса</h1>
            <p className="text-sm text-[#5f5b4d] mt-2">Узнайте, одобрена ли ваша постоянная учетная запись</p>
          </div>

          <form onSubmit={handleCheck} className="space-y-4">
            <div>
              <label className="block text-xs font-headline font-bold text-[#5f5b4d] mb-1 pl-4 uppercase tracking-wider">Никнейм</label>
              <input 
                type="text"
                placeholder="Ваш никнейм"
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
                placeholder="Ваш пароль"
                className="w-full px-5 py-3 rounded-full bg-[#f8f0dc] border-none focus:ring-2 focus:ring-[#785500] text-sm text-[#322f22]"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#785500] text-white rounded-full font-headline font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[#785500]/20 disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {loading ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'Проверить'}
            </button>
          </form>

          <AnimatePresence>
            {statusResult && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className={`overflow-hidden rounded-2xl border p-5 ${
                  statusResult.status === 'approved' 
                    ? 'bg-[#baeed1]/30 border-[#baeed1] text-[#2a5b45]' 
                    : 'bg-[#fec24a]/20 border-[#fec24a]/50 text-[#785500]'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined shrink-0 text-2xl">
                    {statusResult.status === 'approved' ? 'check_circle' : 'pending'}
                  </span>
                  <div>
                    <p className="font-bold font-headline">{statusResult.message}</p>
                    {statusResult.status === 'approved' && (
                      <p className="text-sm mt-1">
                        Ваш постоянный ID: <strong className="font-mono bg-white/50 px-2 py-1 rounded ml-1">{statusResult.specialId}</strong>
                      </p>
                    )}
                  </div>
                </div>
                {statusResult.status === 'approved' && (
                  <button 
                    onClick={() => navigate('/login')} // We will need a user login page, or it can be unified
                    className="mt-3 w-full py-2 bg-white/50 hover:bg-white transition-colors rounded-xl font-bold font-headline text-sm"
                  >
                    Перейти ко входу
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}
