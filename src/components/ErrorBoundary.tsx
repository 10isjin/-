import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCw, RefreshCw, AlertTriangle, ExternalLink, Sparkles, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleSimpleReload = () => {
    window.location.reload();
  };

  private handleCleanReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
    // Bust cache with query param
    const cleanUrl = window.location.origin + window.location.pathname + '?reload=' + Date.now();
    window.location.href = cleanUrl;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Subtle court grid background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px]" />

          <div className="max-w-md w-full bg-slate-900/95 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 text-center space-y-6">
            {/* Header Icon */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-400/10">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                슈팅스타 자동 안전 복구
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                일시적인 화면 오류가 발생했습니다
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                이전 접속 캐시가 남아있거나 네트워크가 일시적으로 불안정할 때 발생할 수 있습니다. 아래 버튼을 눌러 안전하게 다시 시작할 수 있습니다.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={this.handleSimpleReload}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all cursor-pointer active:scale-95"
              >
                <RotateCw className="w-4 h-4" />
                지금 바로 새로고침
              </button>

              <button
                type="button"
                onClick={this.handleCleanReload}
                className="w-full py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                임시 데이터 정리 후 안전하게 재접속
              </button>
            </div>

            {/* In-app browser guide */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <ExternalLink className="w-4 h-4" />
                <span>카카오톡 / 네이버 / 알림장 앱 접속 시 안내</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                스마트폰 앱 내부에서 링크를 열었을 경우 쿠키가 차단되어 빈 화면이 뜰 수 있습니다. 화면 우측 상단이나 하단의 메뉴(<strong className="text-slate-200">···</strong> 또는 <strong className="text-slate-200">⋮</strong>)를 눌러 <strong className="text-amber-300">[다른 브라우저로 열기]</strong>, <strong className="text-amber-300">[Chrome으로 열기]</strong>, 또는 <strong className="text-amber-300">[Safari로 열기]</strong>를 선택해보세요.
              </p>
            </div>

            {/* Technical details toggle for teacher */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="text-[11px] text-slate-500 hover:text-slate-400 underline cursor-pointer"
              >
                {this.state.showDetails ? '오류 세부 내용 닫기' : '선생님 확인용 오류 세부정보'}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-3 rounded-xl bg-slate-950 text-left text-[10px] font-mono text-rose-300 max-h-36 overflow-y-auto border border-rose-900/40">
                  <div className="font-bold mb-1">{this.state.error?.toString()}</div>
                  <div className="text-slate-400 whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
