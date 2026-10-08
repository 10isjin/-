import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Smartphone, Globe, X } from 'lucide-react';

interface BrowserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrowserGuideModal: React.FC<BrowserGuideModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const input = document.createElement('textarea');
        input.value = currentUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100">외부 기본 브라우저로 열기 안내</h3>
              <p className="text-[11px] text-slate-400">카톡/인앱 브라우저 대신 전용 브라우저로 쾌적하게 이용하세요</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 text-xs">
          {/* Samsung / Android Guide */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Smartphone className="w-3.5 h-3.5" />
              <span>삼성 갤럭시 / 안드로이드 폰</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
              <li>
                카카오톡 화면 우측 상단 또는 하단의 <strong className="text-amber-200">[···]</strong> 또는 <strong className="text-amber-200">[⋮]</strong> 메뉴를 누릅니다.
              </li>
              <li>
                메뉴 목록에서 <strong className="text-amber-300">[다른 브라우저로 열기]</strong> 또는 <strong className="text-amber-300">[기본 브라우저로 열기]</strong>를 선택합니다.
              </li>
              <li className="text-slate-400">
                (평소 쓰시는 <strong className="text-slate-200">Chrome(크롬)</strong>이나 <strong className="text-slate-200">삼성 인터넷</strong>으로 즉시 실행됩니다.)
              </li>
            </ol>
          </div>

          {/* iPhone / iOS Guide */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-sky-300 font-bold">
              <Smartphone className="w-3.5 h-3.5" />
              <span>애플 아이폰 (iOS)</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
              <li>
                카카오톡 화면 우측 하단의 <strong className="text-sky-200">[···]</strong> 메뉴를 누릅니다.
              </li>
              <li>
                메뉴에서 <strong className="text-sky-300">[Safari로 열기]</strong> 또는 <strong className="text-sky-300">[기본 브라우저로 열기]</strong>를 선택합니다.
              </li>
            </ol>
          </div>

          {/* Fallback Copy Link */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleCopyLink}
              className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                copied
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>주소가 복사되었습니다! 크롬이나 삼성인터넷에 붙여넣어 주세요</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>주소 복사하기 (크롬/삼성인터넷 주소창에 붙여넣기)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/50 border-t border-slate-800/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
};
