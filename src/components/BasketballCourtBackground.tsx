import React from 'react';

export const BasketballCourtBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Deep space court radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black" />

      {/* Subtle basketball court lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04] stroke-amber-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        strokeWidth="1.5"
      >
        {/* Half court circle */}
        <circle cx="50%" cy="100%" r="280" />
        <circle cx="50%" cy="100%" r="70" />
        {/* Free throw lane */}
        <path d="M calc(50% - 150px) 0 L calc(50% - 150px) 360 L calc(50% + 150px) 360 L calc(50% + 150px) 0" />
        <circle cx="50%" cy="360" r="150" strokeDasharray="6 6" />
        {/* 3-point arc */}
        <path d="M calc(50% - 380px) 0 L calc(50% - 380px) 160 A 420 420 0 0 0 calc(50% + 380px) 160 L calc(50% + 380px) 0" />
      </svg>

      {/* Floating star particles */}
      <div className="absolute top-12 left-1/4 w-1.5 h-1.5 bg-amber-300 rounded-full opacity-40 animate-pulse" />
      <div className="absolute top-1/3 right-1/5 w-2 h-2 bg-amber-400 rounded-full opacity-30 animate-ping" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-1/4 left-1/6 w-1 h-1 bg-yellow-200 rounded-full opacity-50 animate-pulse" />
      <div className="absolute top-2/3 right-1/3 w-1.5 h-1.5 bg-amber-200 rounded-full opacity-40 animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-20 right-16 w-2 h-2 bg-amber-400/30 rounded-full blur-[1px]" />
    </div>
  );
};
