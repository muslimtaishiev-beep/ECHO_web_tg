import React from "react";
import { motion } from "framer-motion";
import { Logo, Button } from "./Shared";

export const Steps = () => {
  const steps = [
    { number: "01", icon: "badge", title: "Анонимный вход", desc: "Просто введи любой никнейм. Мы не храним твои данные.", color: "text-primary" },
    { number: "02", icon: "topic", title: "Выбор темы", desc: "Скажи нам, что на душе сегодня: школа, друзья или тревога.", color: "text-accent" },
    { number: "03", icon: "forum", title: "Разговор", desc: "Живой волонтер ответит сразу. Говори столько, сколько нужно.", color: "text-tertiary" },
  ];

  return (
    <section className="py-32 bg-white relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-24 space-y-4">
          <span className="text-xs font-headline font-black uppercase tracking-[0.3em] text-secondary">Твой путь к спокойствию</span>
          <h2 className="font-headline text-5xl font-extrabold text-on-surface tracking-tight">Весь процесс за 1 минуту</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          {steps.map((step, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="flex flex-col items-center text-center gap-8 group"
            >
              <div className="w-32 h-32 rounded-[2.5rem] bg-surface-container flex items-center justify-center text-on-surface shadow-xl group-hover:bg-primary group-hover:text-white transition-all duration-500 rotate-3 group-hover:rotate-0">
                <span className="material-symbols-outlined text-5xl">{step.icon}</span>
              </div>
              <div className="space-y-3">
                <p className={`font-headline font-black ${step.color} text-lg tracking-widest`}>{step.number}</p>
                <h4 className="font-headline text-2xl font-extrabold text-on-surface">{step.title}</h4>
                <p className="text-on-surface-variant/70 font-medium font-body leading-relaxed max-w-xs">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const Testimonials = () => {
  const reviews = [
    { name: "Анонимно, 15 лет", loc: "Москва", text: "Я не знала, как сказать родителям о буллинге. В Эхо меня выслушали без осуждения и помогли найти правильные слова.", color: "secondary" },
    { name: "Ник: Sunshine", loc: "Алматы", text: "Лучшее место для тех, кто боится открыться. Здесь тебя действительно слышат, а не просто делают вид.", color: "primary" },
    { name: "Анонимно, 17 лет", loc: "Минск", text: "Когда накрывает тревога в 2 часа ночи, Эхо — мой единственный островок спокойствия. Волонтеры просто невероятные.", color: "accent" },
  ];

  return (
    <section className="py-32 bg-surface-container-low overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight">Мы помогли им —<br/>поможем и тебе</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((rev, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -10 }}
              className={`bg-white p-10 rounded-[2.5rem] shadow-xl shadow-${rev.color}/5 border border-${rev.color}/5 relative group ${idx === 1 ? 'md:translate-y-8' : ''}`}
            >
              <div className={`text-${rev.color} opacity-20 absolute top-8 right-8 scale-150`}>
                <span className="material-symbols-outlined text-6xl rotate-12">format_quote</span>
              </div>
              <p className="text-lg font-body font-medium text-on-surface relative z-10 leading-relaxed italic mb-8">"{rev.text}"</p>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full bg-${rev.color}/20 flex items-center justify-center text-${rev.color}`}>
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div>
                  <p className="font-headline font-black text-sm text-on-surface">{rev.name}</p>
                  <p className={`text-[10px] font-headline font-black uppercase tracking-widest text-${rev.color}`}>{rev.loc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const Footer = () => {
  return (
    <footer className="bg-white pt-24 pb-12 border-t border-outline-variant/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
          <div className="md:col-span-2 space-y-8">
            <Logo />
            <p className="text-on-surface-variant text-lg font-body font-medium leading-relaxed max-w-sm">
              Платформа анонимной поддержки для подростков. Твой безопасный уголок в цифровом мире.
            </p>
          </div>
          
          <div className="space-y-8">
            <h4 className="font-headline font-black text-xs uppercase tracking-[0.2em] text-on-surface">Платформа</h4>
            <ul className="space-y-4 font-body font-medium text-on-surface-variant">
              <li><a href="#" className="hover:text-primary transition-colors">Как это работает</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Безопасность</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Для волонтеров</a></li>
            </ul>
          </div>
          
          <div className="space-y-8">
            <h4 className="font-headline font-black text-xs uppercase tracking-[0.2em] text-on-surface">Правила</h4>
            <ul className="space-y-4 font-body font-medium text-on-surface-variant">
              <li><a href="#" className="hover:text-primary transition-colors">Конфиденциальность</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Отказ от ответственности</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Контакты</a></li>
            </ul>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-outline-variant/10 gap-6">
          <p className="text-on-surface-variant/60 font-body text-sm font-medium">© 2024 Echo Platform. Сделано с любовью.</p>
          <div className="flex items-center gap-6 text-on-surface-variant/40">
            <span className="material-symbols-outlined text-xl">encrypted</span>
            <p className="text-xs font-headline font-black tracking-widest uppercase leading-none">AES-256 Encrypted</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
