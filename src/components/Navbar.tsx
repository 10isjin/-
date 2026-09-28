import React from 'react';
import { AppMode } from '../types';
import { Sparkles, ArrowLeft, RefreshCw, Shield, Star, Users, Crosshair } from 'lucide-react';

interface Props {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<Props> = ({
  currentMode,
  onSelectMode,
  onRefresh,
  isRefreshing
}) => {
  const getModeInfo = () => {
    switch (currentMode) {
      case 'performer':
        return {
          title: '슈팅스타, 별을 쏘다',
          subtitle: '수행자 모드',
          badgeClass: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
          icon: Sparkles
        };
      case 'observer':
        return {
          title: '별의별 피드백',
          subtitle: '관찰자 모드',
          badgeClass: 'bg-sky-400/20 text-sky-300 border-sky-400/40',
          icon: Crosshair
        };
      case 'all':
        return {
          title: '학급별빛현황',
          subtitle: '전체확인 모드',
          badgeClass: 'bg-indigo-400/20 text-indigo-300 border-indigo-400/40',
          icon: Star
        };
      case 'teacher':
        return {
          title: '별빛 관제센터',
          subtitle: '교사 모드',
          badgeClass: 'bg-rose-400/20 text-rose-300 border-rose-400/40',
          icon: Shield
        };
      default:
        return null;
    }
  };

  const modeInfo = getModeInfo();

  return (
    <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md sticky top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand logo & title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectMode('home')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 p-[1px] shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center relative overflow-hidden">
                {/* Basketball texture lines inside star */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:6px_6px]" />
                <Star className="w-5 h-5 text-amber-400 fill-amber-400 relative z-10" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white group-hover:text-amber-300 transition-colors">
                  스타워즈
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                  코트 위의 역습
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                농구 슛 자세 상호 피드백 & AI 맞춤 분석
              </p>
            </div>
          </button>

          {/* Current active mode tag if not home */}
          {modeInfo && (
            <div className="hidden md:flex items-center gap-2 pl-3 ml-2 border-l border-slate-800">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${modeInfo.badgeClass}`}>
                <modeInfo.icon className="w-3.5 h-3.5" />
                {modeInfo.title}
              </span>
            </div>
          )}
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2">
          {currentMode !== 'home' && (
            <button
              type="button"
              onClick={() => onSelectMode('home')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white transition-all shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">모드 선택</span> 첫 화면
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="데이터 동기화"
            className="p-2 rounded-xl text-slate-400 hover:text-amber-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
