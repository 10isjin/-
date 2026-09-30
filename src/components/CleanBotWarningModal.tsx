import React from 'react';
import { ShieldAlert, AlertTriangle, HeartHandshake, CheckCircle } from 'lucide-react';
import { CleanBotResult } from '../lib/cleanBot';

interface Props {
  isOpen: boolean;
  cleanResult: CleanBotResult | null;
  onClose: () => void;
}

export const CleanBotWarningModal: React.FC<Props> = ({
  isOpen,
  cleanResult,
  onClose
}) => {
  if (!isOpen || !cleanResult || cleanResult.isValid) return null;

  const getCategoryLabel = () => {
    switch (cleanResult.category) {
      case 'sexual':
        return {
          title: '성적 수치심 유발 및 음란 표현 감지',
          badge: '성적 표현 제재',
          color: 'from-rose-600 to-pink-600',
          textColor: 'text-rose-400',
          borderColor: 'border-rose-500/40'
        };
      case 'profanity':
        return {
          title: '욕설 및 비속어 감지',
          badge: '비속어 제재',
          color: 'from-amber-600 to-orange-600',
          textColor: 'text-amber-400',
          borderColor: 'border-amber-500/40'
        };
      case 'hate':
        return {
          title: '인신공격 및 혐오 표현 감지',
          badge: '언어폭력 제재',
          color: 'from-red-600 to-rose-700',
          textColor: 'text-red-400',
          borderColor: 'border-red-500/40'
        };
      default:
        return {
          title: '부적절한 언어 감지',
          badge: '클린봇 제재',
          color: 'from-amber-600 to-rose-600',
          textColor: 'text-amber-400',
          borderColor: 'border-amber-500/40'
        };
    }
  };

  const info = getCategoryLabel();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-slate-900 border-2 border-rose-500/60 rounded-3xl p-6 shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effect */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 p-0.5 shadow-lg shadow-rose-500/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white tracking-tight">
                클린봇(CleanBot) 안전 알림
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                {info.badge}
              </span>
            </div>
            <p className="text-xs text-rose-300/90 font-medium">
              {info.title}
            </p>
          </div>
        </div>

        {/* Warning Message Card */}
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 mb-4 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-rose-200 leading-relaxed font-semibold">
              {cleanResult.userMessage}
            </div>
          </div>
        </div>

        {/* Educational basketball class pledge */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-2 mb-5">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <HeartHandshake className="w-4 h-4 text-amber-400" />
            <span>건강하고 배려하는 체육 수업 약속</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            • 스타워즈 코트는 서로 칭찬하고 함께 성장하는 배움의 공간입니다.<br />
            • 친구의 슛 자세(하체 반동, 릴리스 타점, 팔로우 스로우 등)에 대해 <strong>힘이 되는 응원과 구체적인 피드백</strong>으로 다시 작성해주세요.
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer active:scale-98 flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          확인하고 고운 말로 다시 작성하기
        </button>
      </div>
    </div>
  );
};
