import React from "react";
import { motion } from "framer-motion";

export const MoodPicker = () => {
  const moods = [
    { emoji: "✨", label: "Легко", color: "bg-primary/5", border: "border-primary/10", hover: "hover:bg-primary/20" },
    { emoji: "🌿", label: "Спокойно", color: "bg-secondary/5", border: "border-secondary/10", hover: "hover:bg-secondary/20" },
    { emoji: "☁️", label: "Туманно", color: "bg-accent/5", border: "border-accent/10", hover: "hover:bg-accent/20" },
    { emoji: "🌧️", label: "Тяжело", color: "bg-tertiary/5", border: "border-tertiary/10", hover: "hover:bg-tertiary/20" },
    { emoji: "🔥", label: "Горю", color: "bg-error/5", border: "border-error/10", hover: "hover:bg-error/20" },
  ];

  return (
    <section className="bg-white py-24 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-6 text-center space-y-12">
        <div className="space-y-4">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-headline font-black uppercase tracking-widest">Твой пульс</span>
          <h2 className="font-headline text-5xl font-extrabold text-on-surface tracking-tight">Как ты сейчас?</h2>
          <p className="text-on-surface-variant font-medium text-lg font-body">Твой ответ полностью анонимен. Это поможет нам найти лучшего собеседника.</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6">
          {moods.map((mood, idx) => (
            <motion.button 
              key={idx}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center gap-4 p-8 rounded-[2.5rem] ${mood.color} ${mood.hover} transition-all w-36 group border ${mood.border}`}
            >
              <span className="text-4xl group-hover:animate-bounce">{mood.emoji}</span>
              <span className="font-headline font-black text-sm text-on-surface">{mood.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

export const BentoFeatures = () => {
  return (
    <section className="py-32 bg-surface-container relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 space-y-20">
        <div className="max-w-2xl">
          <span className="text-xs font-headline font-black uppercase tracking-[0.2em] text-primary block mb-4">Преимущества</span>
          <h2 className="font-headline text-5xl md:text-6xl font-extrabold text-on-surface leading-[0.95] tracking-tighter">Место, где тебя<br/>точно услышат</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 – Large Primary */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="md:col-span-2 relative overflow-hidden bg-white rounded-[3rem] p-12 shadow-2xl shadow-primary/5 flex flex-col justify-between min-h-[400px] border border-primary/5 group"
          >
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors"></div>
            <div className="relative z-10 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-3xl">verified_user</span>
              </div>
              <h3 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight leading-tight">100% Анонимно & Безопасно</h3>
              <p className="text-on-surface-variant/80 text-lg leading-relaxed font-body font-medium max-w-sm">Мы не просим твое имя, почту или телефон. Твой диалог защищен сквозным шифрованием AES-256. Ты — это просто твой никнейм.</p>
            </div>
            <div className="relative z-10 mt-10 flex items-center gap-4 px-6 py-4 bg-primary/5 rounded-2xl w-fit border border-primary/10">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-sm font-headline font-black text-primary uppercase tracking-widest">AES-256 протокол активен</span>
            </div>
          </motion.div>

          {/* Card 2 – Secondary */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-secondary/10 rounded-[3rem] p-10 space-y-6 flex flex-col justify-between border border-secondary/10 group"
          >
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-white shadow-lg shadow-secondary/30">
              <span className="material-symbols-outlined text-3xl">volunteer_activism</span>
            </div>
            <div className="space-y-4">
              <h3 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight">Живой отклик</h3>
              <p className="text-on-surface-variant/80 text-base leading-relaxed font-body font-medium">Никаких ботов. Только волонтеры, готовые выслушать и поддержать в трудную минуту.</p>
            </div>
            <div className="text-4xl font-headline font-black text-secondary tracking-tighter">
              150+ <span className="text-lg font-bold text-on-surface-variant align-middle ml-1">душ</span>
            </div>
          </motion.div>

          {/* Card 3 – Accent */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-accent/10 rounded-[3rem] p-10 space-y-6 border border-accent/10 group"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/30">
              <span className="material-symbols-outlined text-3xl">schedule</span>
            </div>
            <h3 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight">Мы рядом 24/7</h3>
            <p className="text-on-surface-variant/80 text-base leading-relaxed font-body font-medium">Кризис не ждет утра. Ты можешь написать нам в три часа ночи, и тебе ответят.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
