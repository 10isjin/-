import React from 'react';
import { AppMode } from '../types';
import { Sparkles, Crosshair, Star, Shield, ArrowRight, Award, Trophy, Users, Gamepad2, Flame } from 'lucide-react';

interface Props {
  onSelectMode: (mode: AppMode) => void;
  totalFeedbacks: number;
  totalStudents: number;
}

export const ModeSelection: React.FC<Props> = ({
  onSelectMode,
  totalFeedbacks,
  totalStudents
}) => {
  const modes = [
    {
      id: 'performer' as AppMode,
      title: '슈팅스타, 별을 쏘다',
      role: '수행자 모드',
      desc: '자신에게 도착한 친구들의 별과 관찰 피드백을 확인하고, 마음에 드는 피드백에 보답 별을 쏩니다. AI의 객관적 생체역학 종합 코칭을 확인하세요.',
      icon: Sparkles,
      gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
      borderColor: 'border-amber-500/40 hover:border-amber-400',
      tagColor: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
      iconColor: 'text-amber-400',
      accentColor: 'bg-amber-400',
      features: ['학급 및 학번/이름 선택', '미들슛 / 레이업슛 선택', '피드백 열람 및 보답 별(1개) 발송', 'AI 엄격한 종합 분석']
    },
    {
      id: 'observer' as AppMode,
      title: '별의별 피드백',
      role: '관찰자 모드',
      desc: '동료 학생의 슛 자세를 4대 공식 기준(무릎 반동, 릴리스 타점, 팔로우 스로우, 스냅 등)에 맞추어 관찰하고, 1~3개의 별과 솔직한 조언을 전송합니다.',
      icon: Crosshair,
      gradient: 'from-sky-500/20 via-blue-500/10 to-transparent',
      borderColor: 'border-sky-500/40 hover:border-sky-400',
      tagColor: 'bg-sky-400/10 text-sky-300 border-sky-400/30',
      iconColor: 'text-sky-400',
      accentColor: 'bg-sky-400',
      features: ['관찰자 본인 및 대상 친구 선택', '4대 평가기준 원터치 체크', '별(1~3개) 평가 및 코멘트 작성', '로그인 없이 간편한 등록']
    },
    {
      id: 'all' as AppMode,
      title: '학급별빛현황',
      role: '전체확인 모드',
      desc: '학급 전체 학생들의 획득 별 현황을 명렬대로 한눈에 살펴보고 검색합니다. 별을 터치하여 슛 메커니즘 자료와 받은 피드백 상세 리포트를 확인하세요.',
      icon: Star,
      gradient: 'from-indigo-500/20 via-purple-500/10 to-transparent',
      borderColor: 'border-indigo-500/40 hover:border-indigo-400',
      tagColor: 'bg-indigo-400/10 text-indigo-300 border-indigo-400/30',
      iconColor: 'text-indigo-400',
      accentColor: 'bg-indigo-400',
      features: ['학급별 명렬 순위 & 총 별 집계', '학번 및 이름 실시간 검색', '별 클릭 시 슛 자세 자료 & 피드백 열람', '관찰 별 / 보답 별 / 교사 별 분석']
    },
    {
      id: 'teacher' as AppMode,
      title: '별빛 관제센터',
      role: '교사 모드',
      desc: '체육 교사 전용 관리 센터입니다. 학생들에게 교사 전문 피드백과 별을 부여하고, 엑셀 명렬표를 간편하게 복사-붙여넣기하여 학급 명단을 관리합니다.',
      icon: Shield,
      gradient: 'from-rose-500/20 via-red-500/10 to-transparent',
      borderColor: 'border-rose-500/40 hover:border-rose-400',
      tagColor: 'bg-rose-400/10 text-rose-300 border-rose-400/30',
      iconColor: 'text-rose-400',
      accentColor: 'bg-rose-400',
      features: ['교사 관리자 암호 인증 로그인', '교사 전문 피드백 & 별(1~3개) 부여', '엑셀 복사-붙여넣기 명렬표 등록', '학급 관리 및 데이터 백업']
    },
    {
      id: 'game' as AppMode,
      title: '버저빛터',
      role: '게임 모드',
      desc: '원버튼 타이밍으로 즐기는 아케이드 농구 슛 챌린지! 미들슛과 레이업슛을 애니메이션 캐릭터로 쏘아올리고, 제한 시간 60초 내 최다 득점에 도전하여 전교 통합 명예의 전당 1위를 차지하세요.',
      icon: Gamepad2,
      badge: '신설 슛 챌린지',
      gradient: 'from-amber-500/25 via-yellow-500/15 to-transparent',
      borderColor: 'border-amber-400/50 hover:border-amber-300',
      tagColor: 'bg-amber-400/15 text-amber-300 border-amber-400/40',
      iconColor: 'text-amber-400',
      accentColor: 'bg-amber-400',
      features: ['원버튼 슛 타이밍 (스페이스바 / 화면 터치)', '미들 점프슛 & 돌파 레이업슛 교대 챌린지', '60초 버저빛터 & 연속 콤보 온파이어', '학급 구분 없는 전교 통합 명예의 전당']
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
      {/* Hero Title & Subtitle */}
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-amber-500/30 text-xs font-semibold text-amber-300 mb-4 shadow-sm shadow-amber-500/10">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="tracking-wide">STAR WARS : COURT OF STARS</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3 leading-tight">
          스타워즈 : 코트 위의 역습
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          동료와 주고받는 별빛 피드백 & AI 코칭으로 완성하는 나의 시그니처 슛
          <br className="hidden sm:inline" />
          <span className="text-xs sm:text-sm text-slate-400 mt-1 block">입장하실 모드를 아래에서 선택해주세요.</span>
        </p>

        {/* Quick stat counter badge */}
        <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-slate-800/60 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            <span>등록 학생: <strong className="text-white font-bold">{totalStudents}명</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>누적 피드백: <strong className="text-white font-bold">{totalFeedbacks}건</strong></span>
          </div>
        </div>
      </div>

      {/* Mode Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isGame = mode.id === 'game';
          return (
            <div
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className={`group relative rounded-2xl p-6 sm:p-7 bg-slate-900/70 border ${mode.borderColor} transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-950/80 cursor-pointer overflow-hidden flex flex-col justify-between ${
                isGame ? 'md:col-span-2 ring-1 ring-amber-400/30 bg-gradient-to-br from-amber-950/20 via-slate-900/90 to-slate-900/80' : ''
              }`}
            >
              {/* Card top subtle gradient */}
              <div className={`absolute -top-24 -right-24 w-52 h-52 rounded-full bg-gradient-to-br ${mode.gradient} blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-500`} />

              <div>
                {/* Header tag and icon */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${mode.tagColor}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {mode.role}
                    </span>
                    {mode.badge && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-sm animate-pulse">
                        <Flame className="w-3 h-3 fill-current" />
                        {mode.badge}
                      </span>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:border-slate-700 transition-all">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* Card Title */}
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-amber-200 transition-colors">
                  {mode.title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-5">
                  {mode.desc}
                </p>

                {/* Features Pill list */}
                <div className="space-y-1.5 mb-6">
                  {mode.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <span className={`w-1.5 h-1.5 rounded-full ${mode.accentColor}`} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Action Button */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200">
                  모드 바로 입장하기
                </span>
                <span className={`text-xs font-bold ${mode.iconColor} flex items-center gap-1`}>
                  입장하기 &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
