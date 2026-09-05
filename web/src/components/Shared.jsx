import React from "react";
import { BrandLogo } from "./BrandLogo";

export const Logo = ({ className = "w-36" }) => (
  <div className="cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0">
    <BrandLogo className={className} />
  </div>
);

export const Button = ({ 
  children, 
  variant = "primary", 
  className = "", 
  ...props 
}) => {
  const variants = {
    primary: "bg-primary text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95",
    secondary: "bg-secondary text-white shadow-lg shadow-secondary/30 hover:scale-105 active:scale-95",
    glass: "glass text-on-surface hover:bg-white/90 active:scale-95",
    outline: "border-2 border-primary/20 text-primary hover:border-primary/50 active:scale-95",
  };

  return (
    <button 
      className={`px-8 py-4 rounded-full font-headline font-black text-sm tracking-wide transition-all outline-none ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Navbar = () => {
  return (
    <nav className="fixed top-6 left-0 right-0 z-50 px-6">
      <div className="max-w-7xl mx-auto glass rounded-full px-8 py-4 flex items-center justify-between">
        <Logo />
        
        <div className="hidden md:flex items-center gap-8 font-headline font-black text-xs uppercase tracking-widest text-on-surface-variant">
          <a href="#how-it-works" className="hover:text-primary transition-colors">Как это работает</a>
          <a href="#security" className="hover:text-primary transition-colors">Безопасность</a>
          <a href="#volunteers" className="hover:text-primary transition-colors">Волонтёрам</a>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="glass" className="hidden sm:block py-3 px-6">Вход</Button>
          <Button variant="primary" className="py-3 px-6">Поддержать</Button>
        </div>
      </div>
    </nav>
  );
};
