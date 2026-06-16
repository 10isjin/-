import { motion } from 'motion/react';
import { CHALLENGE_GOAL, START_DATE, END_DATE } from '../types';
import { Globe, ArrowRight, Zap, Clock, TrendingUp, Target } from 'lucide-react';

interface EarthProgressProps {
  currentDistance: number;
  lastUpdated: Date | null;
}

export default function EarthProgress({ currentDistance, lastUpdated }: EarthProgressProps) {
  const percentage = Math.min((currentDistance / CHALLENGE_GOAL) * 100, 100);
  
  // Date Calculations (Based on Calendar Days)
  const now = new Date();
  
  // Create dates set to midnight for precise calendar day difference
  const startDay = new Date(START_DATE.getFullYear(), START_DATE.getMonth(), START_DATE.getDate());
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = currentDay.getTime() - startDay.getTime();
  const elapsedDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
  
  const endDay = new Date(END_DATE.getFullYear(), END_DATE.getMonth(), END_DATE.getDate());
  const remainingDays = Math.max(0, Math.round((endDay.getTime() - currentDay.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const dailyAverageActual = currentDistance / elapsedDays;
  const dailyAverageRequired = remainingDays > 0 ? Math.max(0, (CHALLENGE_GOAL - currentDistance) / remainingDays) : 0;

  const dDayText = remainingDays > 0 ? `D-${remainingDays}` : '챌린지 종료';

  return (
    <div className="relative w-full max-w-4xl mx-auto pt-12 pb-8 px-4">
      {/* Background Decorative Planets / Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-emerald-100/30 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-green-100/20 rounded-full blur-[80px]" style={{ animationDelay: '-3s' }} />
      </div>

      <div className="text-center mb-8 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-2 mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black tracking-widest uppercase border border-emerald-100">
            <Zap size={14} className="fill-emerald-600" />
            실시간 진행 현황
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <Clock size={10} />
              최근 업데이트: {lastUpdated.toLocaleString('ko-KR', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          )}
        </motion.div>
        <h2 className="text-5xl md:text-7xl font-black italic-header text-slate-900 mb-4 tracking-tighter leading-[1.1]">
          제2회 <span className="text-slate-800">갈매라쏜</span>(GALmarathon)
          <br />
          <span className="text-emerald-600 inline-flex items-center gap-3">
            갈매지구런 <Globe className="w-[0.8em] h-[0.8em] text-emerald-500 animate-pulse" />
          </span>
        </h2>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="my-6 select-none"
        >
          <span translate="no" className={`notranslate font-black number-font tracking-tighter block ${remainingDays > 0 ? 'text-6xl md:text-8xl text-emerald-600 drop-shadow-sm' : 'text-4xl md:text-6xl text-slate-400'}`}>
            {dDayText}
          </span>
        </motion.div>
        <p className="text-slate-400 max-w-lg mx-auto text-sm md:text-lg font-medium leading-relaxed">
          갈매지구 40,075km 달성 챌린지. <br />
          우리가 함께 뛰는 오늘이 <br className="md:hidden" />지구의 내일이 됩니다.
        </p>
      </div>

      <div className="glass-card rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden bg-white/80 border-emerald-100">
        {/* Progress Display */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">전체 달성률</p>
            <div className="flex items-end gap-2">
              <span className="text-7xl font-black text-emerald-600 number-font tracking-tighter">
                {percentage.toFixed(2)}
              </span>
              <span className="text-2xl font-black text-emerald-300 mb-2">%</span>
            </div>
          </div>

          <div className="flex gap-12">
             <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">목표</p>
              <p className="text-xl font-bold text-slate-900 number-font">40,075 <span className="text-sm text-slate-400">km</span></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">현재</p>
              <p className="text-xl font-bold text-emerald-600 number-font">{currentDistance.toLocaleString()} <span className="text-sm text-emerald-300">km</span></p>
            </div>
          </div>
        </div>

        {/* The Track */}
        <div className="relative h-6 bg-slate-100/80 rounded-full mb-4 group shadow-inner border border-slate-200/50">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-linear-to-r from-emerald-600 via-emerald-400 to-green-300 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 2, ease: "circOut" }}
          >
            {/* Gloss shine */}
            <div className="absolute inset-0 bg-linear-to-b from-white/20 to-transparent pointer-events-none" />
          </motion.div>

          {/* Floating Markers */}
          {[25, 50, 75].map((pos) => (
            <div 
              key={pos} 
              className="absolute top-0 w-px h-full bg-slate-200/50" 
              style={{ left: `${pos}%` }}
            />
          ))}

          {/* Integrated Earth Marker */}
          <motion.div 
            className="absolute top-1/2 w-10 h-10 md:w-14 md:h-14 pointer-events-none z-20 -translate-x-1/2 -translate-y-1/2"
            initial={{ left: 0 }}
            animate={{ left: `${percentage}%` }}
            transition={{ duration: 2, ease: "circOut" }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="absolute inset-0 bg-emerald-400/40 blur-md animate-pulse rounded-full" />
              <div className="bg-white p-1.5 md:p-2.5 rounded-full shadow-lg border-2 border-emerald-500 ring-4 ring-emerald-500/10">
                <Globe size={16} className="text-emerald-500 animate-spin-slow md:hidden" />
                <Globe size={22} className="text-emerald-500 animate-spin-slow hidden md:block" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Labels below track */}
        <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest px-2">
          <span>시작점</span>
          <span className="text-emerald-400">대양 횡단 중</span>
          <span>목표 지점</span>
        </div>
      </div>

      {/* Info Boxes: 2x2 Grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:gap-4">
        {/* 진행 현황 */}
        <div className="bg-slate-900 p-4 rounded-2xl text-white flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/10 rounded-full -mr-6 -mt-6 blur-xl" />
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">진행 현황</p>
          <p className="text-xs font-bold text-emerald-400">
            {remainingDays > 0 ? (
              <>
                {elapsedDays}일차 <span className="text-slate-500 text-[10px] mx-0.5">/</span> 남은 {remainingDays}일
              </>
            ) : (
              <>
                {elapsedDays}일차 <span className="text-slate-500 text-[10px] mx-0.5">/</span> 챌린지 종료
              </>
            )}
          </p>
        </div>

        {/* 남은 거리 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-50 shadow-sm flex flex-col justify-center hover:shadow-md transition-shadow">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
            <ArrowRight size={10} className="text-emerald-500" /> 남은 거리
          </p>
          <p className="text-lg font-black number-font text-slate-900">
            {(CHALLENGE_GOAL - currentDistance).toLocaleString()} <span className="text-[10px] text-slate-400 font-medium">km</span>
          </p>
        </div>

        {/* 현재 일평균 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-50 shadow-sm flex flex-col justify-center hover:shadow-md transition-shadow">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
            <TrendingUp size={10} className="text-emerald-500" /> 현재 일평균
          </p>
          <p className="text-lg font-black number-font text-emerald-600">
            {dailyAverageActual.toFixed(2)} <span className="text-[10px] font-medium ml-0.5">km</span>
          </p>
        </div>

        {/* 목표 일평균 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-50 shadow-sm flex flex-col justify-center hover:shadow-md transition-shadow">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
            <Target size={10} className="text-orange-500" /> 목표 일평균
          </p>
          <p className="text-lg font-black number-font text-orange-600">
            {dailyAverageRequired.toFixed(2)} <span className="text-[10px] font-medium ml-0.5">km</span>
          </p>
        </div>
      </div>

      {/* Challenge Summary */}
      <div className="mt-4 bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-emerald-50 flex items-center gap-4 group">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
          <Globe size={20} />
        </div>
        <div className="flex-1">
          <p className="text-slate-600 text-xs font-medium leading-relaxed">
            지구 <span className="text-emerald-600 font-bold">{(currentDistance / 100).toFixed(2)}개국</span> 돌파! 
            목표까지 일평균 <span className="text-orange-600 font-bold">{dailyAverageRequired.toFixed(2)}km</span>가 더 필요합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
