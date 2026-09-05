import React from "react";
import { Button } from "./Shared";
import { motion } from "framer-motion";

const ChatPreview = () => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.5, duration: 0.8 }}
    className="relative w-full max-w-sm mx-auto"
  >
    {/* Background Glow */}
    <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full scale-150"></div>
    
    {/* Phone Frame */}
    <div className="relative bg-white rounded-[2.5rem] shadow-2xl shadow-primary/10 overflow-hidden border border-outline-variant/20 p-3 pt-6">
      <div className="bg-surface-container rounded-[2rem] overflow-hidden border border-outline-variant/10 min-h-[460px] flex flex-col">
        {/* Chat header */}
        <div className="bg-white px-6 py-5 flex items-center gap-3 border-b border-outline-variant/10">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">volunteer_activism</span>
          </div>
          <div>
            <p className="font-headline font-black text-sm text-on-surface">Волонтёр Алия</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              <p className="text-[10px] text-secondary font-headline font-black uppercase tracking-widest leading-none">онлайн</p>
            </div>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 p-6 space-y-5 bg-surface-container/50">
          <div className="flex items-end gap-2">
            <div className="bg-white rounded-2xl rounded-bl-none p-4 max-w-[85%] shadow-sm text-sm text-on-surface leading-relaxed">
              Привет! Я здесь. Это безопасное место — расскажи, что тебя беспокоит?
            </div>
          </div>
          <div className="flex items-end gap-2 flex-row-reverse">
            <div className="bg-primary rounded-2xl rounded-br-none p-4 max-w-[85%] shadow-lg shadow-primary/20 text-white text-sm leading-relaxed">
              Мне сложно в школе, не знаю с кем поделиться...
            </div>
          </div>
          <div className="flex items-end gap-2 animate-pulse">
            <div className="bg-white rounded-2xl rounded-bl-none p-4 max-w-[85%] shadow-sm text-sm text-on-surface leading-relaxed italic opacity-70">
              Волонтёр печатает...
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="px-5 py-4 bg-white flex items-center gap-3">
          <div className="flex-1 bg-surface-container rounded-full px-5 py-3 text-xs text-on-surface-variant font-medium">Напиши сообщение...</div>
          <button className="w-10 h-10 rounded-full bg-on-surface flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-lg">send</span>
          </button>
        </div>
      </div>
    </div>
    
    {/* Stats Badge */}
    <div className="absolute -right-8 bottom-12 bg-accent rounded-2xl px-6 py-4 text-white shadow-2xl animate-bounce" style={{ animationDuration: "5s" }}>
      <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Сейчас в чате</p>
      <p className="text-2xl font-extrabold tracking-tighter">1,240 <span className="text-sm opacity-90 align-middle ml-1">душ</span></p>
    </div>
  </motion.div>
);

export const Hero = () => {
  return (
    <section className="relative min-h-screen pt-32 pb-20 overflow-hidden flex items-center">
      {/* Dynamic Background Blobs */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[10%] right-[5%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[20%] left-[10%] w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "2s" }}></div>
        <div className="absolute top-[40%] left-[30%] w-[500px] h-[500px] bg-tertiary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "4s" }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        <div className="space-y-12">
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-4 px-4 py-2 bg-primary/10 rounded-full text-primary"
            >
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-xs font-headline font-black uppercase tracking-widest">Анонимно · Бесплатно · Безопасно</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-7xl md:text-8xl font-black text-on-surface tracking-tighter leading-[0.9]"
            >
              Твоё <span className="text-primary">Эхо</span> <br/>
              поддержки.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl text-on-surface-variant font-medium max-w-lg leading-relaxed"
            >
              Первая платформа анонимной помощи подросткам. Мы здесь, чтобы выслушать тебя, когда это больше всего нужно.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-6"
          >
            <Button variant="primary" className="w-full sm:w-auto py-5 px-12 text-lg">Начать разговор</Button>
            <Button variant="glass" className="w-full sm:w-auto py-5 px-10 text-lg flex items-center justify-center gap-3">
              Как это работает
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Button>
          </motion.div>
        </div>

        <ChatPreview />
      </div>
    </section>
  );
};
