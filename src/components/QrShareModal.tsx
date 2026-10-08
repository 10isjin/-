import React, { useState } from 'react';
import { QrCode, X, Copy, Check, ExternalLink, Sparkles, Smartphone, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const QrShareModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const targetUrl = 'https://shootarwars.netlify.app';

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(targetUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = targetUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Failed to copy link', e);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base text-white tracking-tight">
                  수업 QR 친구에게 공유하기
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  실시간 접속
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                수업 중 튕기거나 재접속이 필요한 친구에게 비춰주세요!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center">
          <div className="p-3 sm:p-4 bg-white rounded-2xl shadow-xl border-4 border-amber-400/30 flex items-center justify-center relative group">
            {/* The QR Code image */}
            <img
              src="/qrcode_shootarwars.netlify.app.svg"
              alt="스타워즈 농구 피드백 접속 QR코드"
              className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
              onError={(e) => {
                // Fallback to png if svg fails
                (e.currentTarget as HTMLImageElement).src = '/qrcode_shootarwars.netlify.app.png';
              }}
            />
          </div>

          <p className="text-xs text-amber-300 font-semibold mt-3 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" />
            스마트폰 기본 카메라로 비추면 바로 열립니다
          </p>

          {/* URL & Copy Link Bar */}
          <div className="w-full mt-3 flex items-center justify-between gap-2 p-2 bg-slate-950/70 border border-slate-800 rounded-xl">
            <span className="text-xs text-slate-300 font-mono truncate pl-2">
              {targetUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-400 text-slate-950 hover:bg-amber-300 active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>복사됨!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>링크 복사</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Tips for disconnected students */}
        <div className="mt-4 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
          <div className="flex items-start gap-1.5 text-amber-300/90 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
            <span>튕겨도 데이터 안심! 작성 중이던 피드백과 별점은 서버에 안전하게 영구 저장되어 있습니다.</span>
          </div>
          <div className="flex items-start gap-1.5 text-slate-400">
            <span className="text-slate-500">•</span>
            <span>카카오톡/네이버 인앱 브라우저보다는 <strong>Chrome(크롬)</strong>, <strong>삼성 인터넷</strong>, <strong>Safari</strong> 브라우저 접속을 권장합니다.</span>
          </div>
        </div>

        {/* Bottom Close Button */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
