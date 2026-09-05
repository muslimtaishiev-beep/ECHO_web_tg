import React from 'react';
import { BrandLogo } from '../components/BrandLogo';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <>
      

{/* NAV */}
<nav className="glass fixed top-0 w-full z-50 border-b border-amber-200/20">
  <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
    <div className="flex items-center gap-2">
      <BrandLogo className="w-32" />
    </div>
    <div className="hidden md:flex items-center gap-8">
      <a href="#" className="font-headline text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">О нас</a>
      <a href="#" className="font-headline text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">Как работает</a>
      <a href="#" className="font-headline text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">Волонтёрам</a>
      <a href="#" className="font-headline text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">Ресурсы</a>
    </div>
    <div className="flex items-center gap-3">
      <button onClick={() => navigate('/volunteer')} className="hidden md:block px-5 py-2 rounded-full text-sm font-headline font-bold text-primary hover:bg-primary-container/20 transition-all">Войти</button>
      <button onClick={() => navigate('/chat')} className="px-5 py-2.5 rounded-full text-sm font-headline font-bold bg-gradient-to-br from-primary to-primary-container text-on-primary-container shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Начать чат</button>
    </div>
  </div>
</nav>

{/* HERO */}
<section className="relative pt-28 pb-0 overflow-hidden min-h-screen flex flex-col">
  {/* Organic blobs */}
  <div className="blob animate-blob1 w-[38rem] h-[38rem] bg-primary-container/25 top-[-8%] right-[-8%]" style={{ borderRadius: "60% 40% 30% 70%/60% 30% 70% 40%" }}></div>
  <div className="blob animate-blob2 w-[30rem] h-[30rem] bg-secondary-container/20 top-[30%] left-[-10%]" style={{ borderRadius: "40% 60% 70% 30%/40% 50% 60% 50%" }}></div>
  <div className="blob animate-blob3 w-[20rem] h-[20rem] bg-tertiary-container/15 bottom-[5%] right-[15%]" style={{ borderRadius: "50% 50% 30% 70%/50% 70% 30% 50%" }}></div>

  <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center flex-1 pb-20">
    {/* LEFT TEXT */}
    <div className="space-y-8">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-container/50 text-on-secondary-container text-xs font-headline font-bold uppercase tracking-widest">
        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
        Анонимно · Бесплатно · Безопасно
      </div>
      <h1 className="font-headline text-6xl md:text-7xl font-extrabold text-on-surface tracking-tight leading-[1.05]">
        Тебе не нужно<br/>
        <span className="text-primary relative">справляться одному.
          <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 400 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 8 Q100 2 200 8 Q300 14 398 6" stroke="#fec24a" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
          </svg>
        </span>
      </h1>
      <p className="text-lg text-on-surface-variant leading-relaxed max-w-md font-body">
        ECHO — это место, где можно поговорить с живым человеком. Без имени, без осуждения. Просто поддержка, когда она нужна.
      </p>
      <div className="flex flex-wrap gap-4 items-center">
        <button onClick={() => navigate('/chat')} className="px-8 py-4 rounded-full font-headline font-bold text-base bg-gradient-to-br from-primary to-primary-container text-on-primary-container shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
          <span className="material-symbols-outlined msf text-lg">chat</span>
          Написать волонтёру
        </button>
        <button className="px-7 py-4 rounded-full font-headline font-bold text-sm text-primary bg-surface-container-highest hover:bg-primary-container/30 transition-all">
          Как это работает?
        </button>
      </div>
      {/* Trust badges */}
      <div className="flex flex-wrap gap-4 pt-2">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant font-body">
          <span className="material-symbols-outlined msf text-secondary text-base">verified_user</span>
          Шифрование AES-256
        </div>
        <div className="flex items-center gap-2 text-xs text-on-surface-variant font-body">
          <span className="material-symbols-outlined msf text-secondary text-base">visibility_off</span>
          Без регистрации личных данных
        </div>
        <div className="flex items-center gap-2 text-xs text-on-surface-variant font-body">
          <span className="material-symbols-outlined msf text-secondary text-base">schedule</span>
          Онлайн 24/7
        </div>
      </div>
    </div>

    {/* RIGHT: CHAT PREVIEW */}
    <div className="relative flex justify-center animate-float">
      <div className="w-full max-w-sm">
        {/* Phone frame */}
        <div className="bg-surface-container-lowest rounded-xl shadow-2xl shadow-primary/10 overflow-hidden border border-amber-100/60">
          {/* Chat header */}
          <div className="bg-surface-container px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined msf text-on-secondary-container">volunteer_activism</span>
            </div>
            <div>
              <p className="font-headline font-bold text-sm text-on-surface">Волонтёр Алия</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                <p className="text-xs text-secondary font-headline font-bold uppercase tracking-widest">онлайн</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-secondary-container/40 rounded-full">
              <span className="material-symbols-outlined msf text-secondary text-xs">lock</span>
              <span className="text-[10px] text-secondary font-headline font-bold uppercase tracking-widest">защищено</span>
            </div>
          </div>
          {/* Messages */}
          <div className="p-5 space-y-4 bg-surface-container-low/30 min-h-[320px]">
            {/* Volunteer msg */}
            <div className="flex items-end gap-2 animate-slideIn chat-delay-1">
              <div className="w-7 h-7 rounded-full bg-surface-container-highest flex-shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined msf text-on-surface-variant text-xs">person</span>
              </div>
              <div className="bg-surface-container-lowest rounded-xl rounded-bl-none p-3.5 max-w-[80%] shadow-sm">
                <p className="text-sm leading-relaxed text-on-surface">Привет! Я здесь. Это безопасное место — расскажи, что тебя беспокоит?</p>
                <span className="text-[10px] text-on-surface-variant/50 block mt-1.5">10:42</span>
              </div>
            </div>
            {/* User msg */}
            <div className="flex items-end gap-2 flex-row-reverse animate-slideIn chat-delay-2">
              <div className="w-7 h-7 rounded-full bg-primary-container flex-shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined msf text-on-primary-container text-xs">mood</span>
              </div>
              <div className="bg-primary-container rounded-xl rounded-br-none p-3.5 max-w-[80%] shadow-sm">
                <p className="text-sm leading-relaxed text-on-primary-container">Мне сложно в школе, никому не могу сказать об этом...</p>
                <span className="text-[10px] text-on-primary-container/50 block mt-1.5 text-right">10:44</span>
              </div>
            </div>
            {/* Volunteer reply */}
            <div className="flex items-end gap-2 animate-slideIn chat-delay-3">
              <div className="w-7 h-7 rounded-full bg-surface-container-highest flex-shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined msf text-on-surface-variant text-xs">person</span>
              </div>
              <div className="bg-surface-container-lowest rounded-xl rounded-bl-none p-3.5 max-w-[80%] shadow-sm">
                <p className="text-sm leading-relaxed text-on-surface">Спасибо, что поделился. Ты смелый. Расскажи подробнее — я никуда не тороплюсь ☀️</p>
                <span className="text-[10px] text-on-surface-variant/50 block mt-1.5">10:45</span>
              </div>
            </div>
            {/* Typing indicator */}
            <div className="flex items-end gap-2 animate-slideIn chat-delay-4">
              <div className="w-7 h-7 rounded-full bg-surface-container-highest flex-shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined msf text-on-surface-variant text-xs">person</span>
              </div>
              <div className="bg-surface-container-lowest rounded-xl rounded-bl-none px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-2 h-2 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: "0s" }}></span>
                  <span className="w-2 h-2 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: "0.15s" }}></span>
                  <span className="w-2 h-2 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: "0.3s" }}></span>
                </div>
              </div>
            </div>
          </div>
          {/* Input bar */}
          <div className="px-4 py-3 bg-surface-container flex items-center gap-3">
            <div className="flex-1 bg-surface-container-low rounded-full px-4 py-2.5 text-sm text-on-surface-variant/50 font-body">Напиши сообщение...</div>
            <button className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-md shadow-primary/20 flex-shrink-0">
              <span className="material-symbols-outlined msf text-on-primary-container text-lg">send</span>
            </button>
          </div>
        </div>
        {/* Floating affirmation card */}
        <div className="glass absolute -left-12 top-12 px-5 py-4 rounded-xl shadow-xl max-w-[180px] hidden md:block border border-white/30">
          <p className="font-headline font-bold text-primary text-sm italic">"Ты справишься. Мы рядом."</p>
          <p className="text-xs text-on-surface-variant mt-1 font-body">— Утреннее напоминание</p>
        </div>
        {/* Stats badge */}
        <div className="glass absolute -right-8 bottom-20 px-4 py-3 rounded-xl shadow-xl hidden md:block border border-white/30">
          <p className="text-2xl font-headline font-extrabold text-primary stat-num">2 400+</p>
          <p className="text-xs text-on-surface-variant font-body">разговоров сегодня</p>
        </div>
      </div>
    </div>
  </div>

  {/* Wave separator */}
  <div className="relative h-16 w-full overflow-hidden -mb-1 z-10">
    <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-full">
      <path d="M0,30 C360,60 720,0 1080,35 C1260,50 1380,15 1440,30 L1440,60 L0,60 Z" fill="#f8f0dc"/>
    </svg>
  </div>
</section>

{/* MOOD CHECK-IN */}
<section className="bg-surface-container-low py-20">
  <div className="max-w-4xl mx-auto px-6 text-center space-y-12">
    <div>
      <span className="inline-block px-4 py-1.5 rounded-full bg-primary-container/40 text-on-primary-container text-xs font-headline font-bold uppercase tracking-widest mb-4">Прямо сейчас</span>
      <h2 className="font-headline text-4xl font-extrabold text-on-surface">Как ты себя чувствуешь?</h2>
      <p className="text-on-surface-variant mt-3 font-body">Это анонимно. Никто не узнает.</p>
    </div>
    <div className="flex flex-wrap justify-center gap-5">
      <button className="mood-btn flex flex-col items-center gap-3 p-6 rounded-xl bg-surface-container-lowest hover:bg-primary-container/30 transition-all w-28 group active:scale-95">
        <span className="mood-emoji">✨</span>
        <span className="font-headline font-bold text-xs text-on-surface-variant group-hover:text-on-primary-container">Отлично</span>
      </button>
      <button className="mood-btn flex flex-col items-center gap-3 p-6 rounded-xl bg-surface-container-lowest hover:bg-secondary-container/50 transition-all w-28 group active:scale-95">
        <span className="mood-emoji">🌿</span>
        <span className="font-headline font-bold text-xs text-on-surface-variant group-hover:text-on-secondary-container">Спокойно</span>
      </button>
      <button className="mood-btn flex flex-col items-center gap-3 p-6 rounded-xl bg-surface-container-lowest hover:bg-amber-100 transition-all w-28 group active:scale-95">
        <span className="mood-emoji">☁️</span>
        <span className="font-headline font-bold text-xs text-on-surface-variant">Устал</span>
      </button>
      <button className="mood-btn flex flex-col items-center gap-3 p-6 rounded-xl bg-surface-container-lowest hover:bg-tertiary-container/30 transition-all w-28 group active:scale-95">
        <span className="mood-emoji">😔</span>
        <span className="font-headline font-bold text-xs text-on-surface-variant">Грустно</span>
      </button>
      <button className="mood-btn flex flex-col items-center gap-3 p-6 rounded-xl bg-surface-container-lowest hover:bg-error/10 transition-all w-28 group active:scale-95">
        <span className="mood-emoji">🌧️</span>
        <span className="font-headline font-bold text-xs text-on-surface-variant">Тяжело</span>
      </button>
    </div>
    <p className="text-xs text-on-surface-variant/60 font-body">После выбора мы подберём подходящего волонтёра</p>
  </div>
  <div className="relative h-16 w-full overflow-hidden -mb-1 mt-8">
    <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-full">
      <path d="M0,20 C480,55 960,0 1440,25 L1440,60 L0,60 Z" fill="#fdf6e3"/>
    </svg>
  </div>
</section>

{/* WHY ECHO: BENTO GRID */}
<section className="py-24 bg-surface">
  <div className="max-w-7xl mx-auto px-6 space-y-16">
    <div className="max-w-xl">
      <span className="text-xs font-headline font-bold uppercase tracking-widest text-primary block mb-3">Почему ECHO?</span>
      <h2 className="font-headline text-4xl font-extrabold text-on-surface leading-tight">Место, где тебя<br/>точно поймут</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Card 1 – big */}
      <div className="md:col-span-2 relative overflow-hidden bg-surface-container-lowest rounded-xl p-10 shadow-sm flex flex-col justify-between min-h-[300px]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/20 rounded-full translate-x-16 -translate-y-16 blob animate-blob1"></div>
        <div className="relative z-10 space-y-5">
          <div className="w-14 h-14 rounded-xl bg-primary-container/30 flex items-center justify-center">
            <span className="material-symbols-outlined msf text-primary text-3xl">shield</span>
          </div>
          <h3 className="font-headline text-2xl font-extrabold text-on-surface">Полная анонимность</h3>
          <p className="text-on-surface-variant leading-relaxed font-body max-w-sm">Никакого имени, телефона или email. Просто никнейм — и ты уже в безопасном пространстве. Все сообщения шифруются военным стандартом AES-256.</p>
        </div>
        <div className="relative z-10 mt-8 flex items-center gap-3 px-4 py-3 bg-secondary-container/30 rounded-full w-fit">
          <span className="material-symbols-outlined msf text-secondary text-sm">lock</span>
          <span className="text-xs font-headline font-bold text-on-secondary-container uppercase tracking-widest">AES-256 активен</span>
        </div>
      </div>
      {/* Card 2 */}
      <div className="bg-secondary-container/30 rounded-xl p-8 space-y-5 flex flex-col justify-between">
        <div className="w-14 h-14 rounded-xl bg-secondary-container flex items-center justify-center">
          <span className="material-symbols-outlined msf text-on-secondary-container text-3xl">volunteer_activism</span>
        </div>
        <div className="space-y-3">
          <h3 className="font-headline text-xl font-extrabold text-on-surface">Живые волонтёры</h3>
          <p className="text-on-surface-variant text-sm leading-relaxed font-body">Только настоящие люди, прошедшие проверку. Не боты, не скрипты.</p>
        </div>
        <div className="text-3xl font-headline font-extrabold text-secondary stat-num">150+<span className="text-sm font-body text-on-surface-variant font-normal ml-2">волонтёров</span></div>
      </div>
      {/* Card 3 */}
      <div className="bg-tertiary-container/20 rounded-xl p-8 space-y-5">
        <div className="w-14 h-14 rounded-xl bg-tertiary-container/50 flex items-center justify-center">
          <span className="material-symbols-outlined msf text-tertiary text-3xl">schedule</span>
        </div>
        <h3 className="font-headline text-xl font-extrabold text-on-surface">24/7 онлайн</h3>
        <p className="text-on-surface-variant text-sm leading-relaxed font-body">Будь то 2 часа дня или 3 ночи — кто-то всегда здесь.</p>
      </div>
      {/* Card 4 */}
      <div className="bg-surface-container-lowest rounded-xl p-8 space-y-5">
        <div className="w-14 h-14 rounded-xl bg-primary-container/40 flex items-center justify-center">
          <span className="material-symbols-outlined msf text-primary text-3xl">psychology</span>
        </div>
        <h3 className="font-headline text-xl font-extrabold text-on-surface">Выбери тему</h3>
        <p className="text-on-surface-variant text-sm leading-relaxed font-body">Тревога, учёба, семья, дружба — говори о том, что важно именно тебе.</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="px-3 py-1 rounded-full bg-primary-container/30 text-on-primary-container text-xs font-headline font-bold">Тревога</span>
          <span className="px-3 py-1 rounded-full bg-secondary-container/50 text-on-secondary-container text-xs font-headline font-bold">Учёба</span>
          <span className="px-3 py-1 rounded-full bg-tertiary-container/30 text-on-tertiary-container text-xs font-headline font-bold">Семья</span>
          <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-headline font-bold">Одиночество</span>
        </div>
      </div>
      {/* Card 5 – wide */}
      <div className="md:col-span-1 relative overflow-hidden bg-gradient-to-br from-primary to-primary-container rounded-xl p-8 space-y-5 flex flex-col justify-between">
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/10 rounded-full translate-x-12 translate-y-12"></div>
        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
          <span className="material-symbols-outlined msf text-on-primary-container text-3xl">bolt</span>
        </div>
        <div className="space-y-3 relative z-10">
          <h3 className="font-headline text-xl font-extrabold text-on-primary-container">Начать можно за 30 секунд</h3>
          <p className="text-on-primary-container/70 text-sm leading-relaxed font-body">Никакой регистрации. Просто открой и начни.</p>
        </div>
        <button onClick={() => navigate('/chat')} className="w-full py-3 rounded-full bg-surface-container-lowest text-primary font-headline font-bold text-sm hover:bg-white transition-all relative z-10 active:scale-95">
          Попробовать →
        </button>
      </div>
    </div>
  </div>
</section>

{/* HOW IT WORKS */}
<section className="py-24 bg-surface-container-low relative overflow-hidden">
  <div className="blob w-72 h-72 bg-secondary-container/20 top-10 right-0 animate-blob2" style={{ borderRadius: "40% 60% 70% 30%/40% 50% 60% 50%" }}></div>
  <div className="max-w-6xl mx-auto px-6 relative z-10">
    <div className="text-center mb-16 space-y-3">
      <span className="text-xs font-headline font-bold uppercase tracking-widest text-primary block">Просто и понятно</span>
      <h2 className="font-headline text-4xl font-extrabold text-on-surface">Как это работает</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
      {/* Connecting line (decorative) */}
      <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-transparent via-primary-container to-transparent"></div>
      {/* Steps */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0 }} className="flex flex-col items-center text-center gap-4 relative cursor-pointer group">
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0 }} className="w-24 h-24 rounded-full bg-surface-container-lowest shadow-lg shadow-primary/10 flex items-center justify-center z-10 group-hover:bg-primary-container transition-colors duration-500">
          <span className="material-symbols-outlined msf text-primary text-4xl group-hover:scale-125 transition-transform duration-500">badge</span>
        </motion.div>
        <div>
          <p className="font-headline font-extrabold text-primary text-sm uppercase tracking-widest mb-1 group-hover:text-tertiary transition-colors">01</p>
          <h4 className="font-headline font-bold text-on-surface">Придумай никнейм</h4>
          <p className="text-sm text-on-surface-variant mt-2 font-body leading-relaxed group-hover:text-on-surface transition-colors">Никаких реальных данных не нужно</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-col items-center text-center gap-4 relative cursor-pointer group">
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} className="w-24 h-24 rounded-full bg-surface-container-lowest shadow-lg shadow-primary/10 flex items-center justify-center z-10 group-hover:bg-primary-container transition-colors duration-500">
          <span className="material-symbols-outlined msf text-primary text-4xl group-hover:scale-125 transition-transform duration-500 group-hover:-rotate-6">topic</span>
        </motion.div>
        <div>
          <p className="font-headline font-extrabold text-primary text-sm uppercase tracking-widest mb-1 group-hover:text-tertiary transition-colors">02</p>
          <h4 className="font-headline font-bold text-on-surface">Выбери тему</h4>
          <p className="text-sm text-on-surface-variant mt-2 font-body leading-relaxed group-hover:text-on-surface transition-colors">Скажи, о чём хочешь поговорить</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }} className="flex flex-col items-center text-center gap-4 relative cursor-pointer group">
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.8 }} className="w-24 h-24 rounded-full bg-primary-container shadow-lg shadow-primary/20 flex items-center justify-center z-10 group-hover:bg-tertiary-container transition-colors duration-500">
          <span className="material-symbols-outlined msf text-on-primary-container text-4xl group-hover:scale-125 transition-transform duration-500 group-hover:text-tertiary">forum</span>
        </motion.div>
        <div>
          <p className="font-headline font-extrabold text-primary text-sm uppercase tracking-widest mb-1 group-hover:text-tertiary transition-colors">03</p>
          <h4 className="font-headline font-bold text-on-surface">Начни диалог</h4>
          <p className="text-sm text-on-surface-variant mt-2 font-body leading-relaxed group-hover:text-on-surface transition-colors">Волонтёр ответит в реальном времени</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }} className="flex flex-col items-center text-center gap-4 relative cursor-pointer group">
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.2 }} className="w-24 h-24 rounded-full bg-surface-container-lowest shadow-lg shadow-primary/10 flex items-center justify-center z-10 group-hover:bg-primary-container transition-colors duration-500">
          <span className="material-symbols-outlined msf text-primary text-4xl group-hover:scale-125 transition-transform duration-300 animate-pulse group-hover:text-tertiary">favorite</span>
        </motion.div>
        <div>
          <p className="font-headline font-extrabold text-primary text-sm uppercase tracking-widest mb-1 group-hover:text-tertiary transition-colors">04</p>
          <h4 className="font-headline font-bold text-on-surface">Почувствуй поддержку</h4>
          <p className="text-sm text-on-surface-variant mt-2 font-body leading-relaxed group-hover:text-on-surface transition-colors">Стало легче — это и есть цель</p>
        </div>
      </motion.div>
    </div>
  </div>
</section>

{/* TESTIMONIALS */}
<section className="py-24 bg-surface relative overflow-hidden">
  <div className="blob w-80 h-80 bg-primary-container/15 bottom-0 left-1/3 animate-blob1" style={{ borderRadius: "60% 40% 30% 70%/60% 30% 70% 40%" }}></div>
  <div className="max-w-7xl mx-auto px-6 relative z-10 space-y-16">
    <div className="text-center space-y-3">
      <span className="text-xs font-headline font-bold uppercase tracking-widest text-primary block">Истории</span>
      <h2 className="font-headline text-4xl font-extrabold text-on-surface">Что говорят пользователи</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
      <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="flex flex-col gap-5 cursor-pointer group">
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0 }} className="bg-surface-container-lowest p-8 rounded-xl rounded-bl-none shadow-md shadow-primary/5 relative group-hover:shadow-primary/30 group-hover:scale-[1.02] transition-all duration-300">
          <div className="absolute top-6 right-6 text-5xl font-headline text-primary-container font-extrabold leading-none group-hover:scale-110 transition-transform">"</div>
          <p className="text-lg font-body italic text-on-surface leading-relaxed relative z-10 group-hover:text-primary transition-colors">Я никогда не думал, что смогу говорить об этом с кем-то. ECHO дал мне это пространство — без страха, что осудят. Теперь мне намного легче.</p>
        </motion.div>
        <div className="flex items-center gap-4 px-2">
          <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center font-headline font-bold text-on-primary-container group-hover:bg-tertiary-container group-hover:text-on-tertiary-container transition-colors">А</div>
          <div>
            <p className="font-headline font-bold text-primary group-hover:text-tertiary transition-colors">Алексей, 16</p>
            <p className="text-xs text-on-surface-variant font-body">Пользователь с января 2024</p>
          </div>
          <div className="ml-auto flex gap-0.5">
            <span className="text-primary-container text-xl animate-pulse">★★★★★</span>
          </div>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="flex flex-col gap-5 md:mt-16 cursor-pointer group">
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="bg-primary-container/20 p-8 rounded-xl rounded-br-none shadow-md shadow-primary/5 relative group-hover:shadow-primary/30 group-hover:scale-[1.02] group-hover:bg-primary-container/40 transition-all duration-300">
          <div className="absolute top-6 left-6 text-5xl font-headline text-primary-container font-extrabold leading-none group-hover:scale-110 transition-transform group-hover:text-primary">"</div>
          <p className="text-lg font-body italic text-on-surface leading-relaxed relative z-10 pl-8 group-hover:text-primary transition-colors">Как школьный психолог, я рекомендую ECHO всем подросткам. Это мост между тем, что они чувствуют — и помощью, которую они заслуживают.</p>
        </motion.div>
        <div className="flex items-center gap-4 px-2 justify-end">
          <div className="text-right">
            <p className="font-headline font-bold text-primary group-hover:text-tertiary transition-colors">Сабина Ахметова</p>
            <p className="text-xs text-on-surface-variant font-body">Школьный психолог, г. Бишкек</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center font-headline font-bold text-on-secondary-container group-hover:bg-tertiary-container group-hover:text-on-tertiary-container transition-colors">С</div>
        </div>
      </motion.div>
    </div>
    {/* Stats row */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8">
      <div className="text-center space-y-1">
        <p className="font-headline font-extrabold text-4xl text-primary stat-num">12K+</p>
        <p className="text-sm text-on-surface-variant font-body">разговоров</p>
      </div>
      <div className="text-center space-y-1">
        <p className="font-headline font-extrabold text-4xl text-primary stat-num">150+</p>
        <p className="text-sm text-on-surface-variant font-body">волонтёров</p>
      </div>
      <div className="text-center space-y-1">
        <p className="font-headline font-extrabold text-4xl text-primary stat-num">4.9</p>
        <p className="text-sm text-on-surface-variant font-body">средняя оценка</p>
      </div>
      <div className="text-center space-y-1">
        <p className="font-headline font-extrabold text-4xl text-primary stat-num">0</p>
        <p className="text-sm text-on-surface-variant font-body">утечек данных</p>
      </div>
    </div>
  </div>
</section>

{/* FINAL CTA */}
<section className="py-32 bg-surface-container-low text-center relative overflow-hidden">
  <div className="blob w-96 h-96 bg-primary-container/25 top-[-20%] left-1/2 -translate-x-1/2 animate-blob3" style={{ borderRadius: "50% 50% 30% 70%/50% 70% 30% 50%" }}></div>
  <div className="blob w-64 h-64 bg-secondary-container/20 bottom-0 right-10 animate-blob2" style={{ borderRadius: "40% 60% 70% 30%/40% 50% 60% 50%" }}></div>
  <div className="max-w-3xl mx-auto px-6 relative z-10 space-y-10">
    <div className="space-y-4">
      <span className="text-xs font-headline font-bold uppercase tracking-widest text-primary">Сделай первый шаг</span>
      <h2 className="font-headline text-5xl md:text-6xl font-extrabold text-on-surface tracking-tight leading-tight">
        Готов поговорить?
        <span className="block text-primary">Мы здесь.</span>
      </h2>
      <p className="text-xl text-on-surface-variant font-body leading-relaxed max-w-xl mx-auto">
        Это займёт меньше минуты. Анонимно, бесплатно, без регистрации.
      </p>
    </div>
    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
      <button onClick={() => navigate('/chat')} className="px-12 py-5 rounded-full font-headline font-extrabold text-lg bg-gradient-to-br from-primary to-primary-container text-on-primary-container shadow-2xl shadow-primary/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
        <span className="material-symbols-outlined msf text-xl">chat_bubble</span>
        Начать чат с волонтёром
      </button>
      <button className="px-8 py-5 rounded-full font-headline font-bold text-base text-primary bg-surface-container-highest hover:bg-primary-container/30 transition-all">
        Экстренная помощь →
      </button>
    </div>
    <p className="text-xs text-on-surface-variant/50 font-body">Все данные зашифрованы · Никто не узнает, кто ты · Всегда бесплатно</p>
  </div>
</section>

{/* FOOTER */}
<footer className="bg-surface-container py-14 px-8">
  <div className="max-w-7xl mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
      <div className="md:col-span-2 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined msf text-on-primary-container text-lg">self_improvement</span>
          </div>
          <span className="font-headline font-extrabold text-xl text-on-surface">ECHO</span>
        </div>
        <p className="text-sm text-on-surface-variant font-body leading-relaxed max-w-xs">Платформа анонимной психологической помощи подросткам. Потому что каждый заслуживает быть услышанным.</p>
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary-container/30 rounded-full w-fit">
          <span className="material-symbols-outlined msf text-secondary text-sm">verified_user</span>
          <span className="text-xs font-headline font-bold text-on-secondary-container uppercase tracking-widest">Шифрование AES-256</span>
        </div>
      </div>
      <div className="space-y-4">
        <h4 className="font-headline font-bold text-on-surface text-sm uppercase tracking-wider">Платформа</h4>
        <ul className="space-y-3">
          <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors font-body">Как работает</a></li>
          <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors font-body">Стать волонтёром</a></li>
          <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors font-body">Ресурсы</a></li>
          <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors font-body">FAQ</a></li>
        </ul>
      </div>
      <div className="space-y-4">
        <h4 className="font-headline font-bold text-on-surface text-sm uppercase tracking-wider">Поддержка</h4>
        <ul className="space-y-3">
          <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors font-body">Экстренная помощь</a></li>
          <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors font-body">Политика конфиденциальности</a></li>
          <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors font-body">Детали шифрования</a></li>
          <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors font-body">Контакты</a></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-outline-variant/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
      <p className="text-xs text-on-surface-variant/60 font-body">© 2025 ECHO. Твоя безопасность — наш приоритет.</p>
      <p className="text-xs text-on-surface-variant/40 font-body">Сделано с ☀️ для тех, кому нужна поддержка</p>
    </div>
  </div>
</footer>


    </>
  );
}
