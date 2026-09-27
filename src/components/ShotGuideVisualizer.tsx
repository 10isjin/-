import React, { useState } from 'react';
import { ShotType, MIDDLE_SHOT_CRITERIA, LAYUP_SHOT_CRITERIA } from '../types';
import { CheckCircle2, AlertTriangle, Eye, Flame, Award, Play } from 'lucide-react';

interface Props {
  initialShotType?: ShotType;
}

export const ShotGuideVisualizer: React.FC<Props> = ({ initialShotType = 'middle' }) => {
  const [shotType, setShotType] = useState<ShotType>(initialShotType);
  const [activeStep, setActiveStep] = useState<number>(1);

  const middleSteps = [
    {
      step: 1,
      title: '1단계: 딥(Dip) & 무릎 반동',
      desc: '공을 캐치하는 순간 무릎을 30~45도 가볍게 굽혀 탄력을 축적합니다. 상체가 앞으로 과도하게 쏠리지 않도록 밸런스를 잡습니다.',
      criterionMatch: '① 슛 직전 무릎을 부드럽게 굽혀 반동을 이용하여 슛 할 수 있다.',
      checkpoint: '양발은 어깨너비 11자, 뒤꿈치가 살짝 들리며 지면 반발력을 온몸으로 전달할 준비.',
      color: 'from-amber-500 to-orange-500'
    },
    {
      step: 2,
      title: '2단계: 수직 점프 & 셋포인트 상승',
      desc: '무릎을 펴면서 수직으로 도약하며, 공을 가슴에서 이마 앞 상단(눈 위 15~20cm) 셋포인트로 자연스럽게 끌어올립니다.',
      criterionMatch: '② 슛 릴리스 위치가 캐치한 공의 위치보다 높은 곳에서 이루어 질 수 있게 할 수 있다.',
      checkpoint: '슛하는 팔의 팔꿈치가 지면과 수직을 이루고, 공 밑을 손바닥이 아닌 손가락 마디로 받침.',
      color: 'from-orange-500 to-amber-400'
    },
    {
      step: 3,
      title: '3단계: 릴리스 & 손목 스냅',
      desc: '점프의 정점 직전, 팔꿈치를 펴며 마지막에 손목 스냅을 강하게 채어 공에 규칙적인 역회전(백스핀)을 부여합니다.',
      criterionMatch: '④ 슛 릴리스 시 손목 스냅을 활용할 수 있다.',
      checkpoint: '검지와 중지 끝으로 마지막 릴리스, 손끝이 림을 가리키는 거위 목(Goose Neck) 형태.',
      color: 'from-amber-400 to-yellow-400'
    },
    {
      step: 4,
      title: '4단계: 팔로우 스로우 & 균형 착지',
      desc: '공이 손을 떠난 뒤에도 팔을 림 방향 45~60도 각도로 끝까지 뻗어 자세를 1초간 유지하며 양발로 안정되게 착지합니다.',
      criterionMatch: '③ 슛 이후 림을 향해 팔을 끝까지 뻗는 팔로우 스로우 동작을 수행할 수 있다.',
      checkpoint: '팔을 급하게 내리지 않고, 슛 라인을 눈으로 확인하며 밸런스 유지.',
      color: 'from-yellow-400 to-emerald-400'
    }
  ];

  const layupSteps = [
    {
      step: 1,
      title: '1단계: 드리블-캐치 & 1스텝',
      desc: '골대로 돌파하며 드리블 후 마지막 바운드된 공을 안전하게 두 손으로 캐치함과 동시에 오른발(오른손 레이업 기준)을 강하게 딛습니다.',
      criterionMatch: '① 드리블-캐치 후 레이업 시 스텝을 정확하게 구사할 수 있다.',
      checkpoint: '보폭을 길게 가져가 수평 속도를 유지하면서 균형을 무너뜨리지 않는 전방 추진력 확보.',
      color: 'from-sky-500 to-blue-500'
    },
    {
      step: 2,
      title: '2단계: 2스텝 & 수직 도약 리프트',
      desc: '이어서 왼발을 짧고 강하게 딛고, 오른 무릎을 가슴 높이로 높게 차올려 수평 속도를 수직 점프로 전환합니다.',
      criterionMatch: '③ 점프할 때 한 쪽 다리를 들어올려 수직 추진력을 얻을 수 있다.',
      checkpoint: '오른 무릎과 오른 팔이 마치 줄로 연결된 듯이 함께 수직 상승하는 모션.',
      color: 'from-blue-500 to-indigo-500'
    },
    {
      step: 3,
      title: '3단계: 백보드 겨냥점 터치',
      desc: '최고 정점에서 공을 머리 위로 부드럽게 올린 뒤, 백보드의 작은 사각형 우측 상단 모서리를 겨냥해 부드럽게 얹어놓습니다.',
      criterionMatch: '② 백보드의 사각형 겨냥점을 정확히 맞출 수 있다.',
      checkpoint: '공을 던지지 않고 보드에 살포시 키스하듯 언더핸드/오버핸드로 릴리스.',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      step: 4,
      title: '4단계: 유기적 연결 & 무릎 착지',
      desc: '드리블부터 캐치, 스텝, 점프, 릴리스까지 끊김 없이 유기적인 한 동작(Fluid Motion)으로 이어지며 충격을 흡수하며 착지합니다.',
      criterionMatch: '④ 드리블-스텝-점프까지의 과정이 끊김없이 연결된 동작으로 수행할 수 있다.',
      checkpoint: '도약 순간 멈칫거림 없이 탄력적인 연결 흐름 완성.',
      color: 'from-purple-500 to-pink-500'
    }
  ];

  const currentSteps = shotType === 'middle' ? middleSteps : layupSteps;
  const currentCriteria = shotType === 'middle' ? MIDDLE_SHOT_CRITERIA : LAYUP_SHOT_CRITERIA;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-xl">
      {/* Tab switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400 shrink-0" />
          <h3 className="font-bold text-base sm:text-lg text-slate-100">슛 메커니즘 동작 분석 & 평가기준 자료</h3>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => { setShotType('middle'); setActiveStep(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              shotType === 'middle'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            미들슛 가이드
          </button>
          <button
            type="button"
            onClick={() => { setShotType('layup'); setActiveStep(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              shotType === 'layup'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            레이업슛 가이드
          </button>
        </div>
      </div>

      {/* Step navigator */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {currentSteps.map((s) => {
          const isSelected = activeStep === s.step;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => setActiveStep(s.step)}
              className={`text-left p-2.5 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-amber-500/15 border-amber-400/60 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  STEP {s.step}
                </span>
              </div>
              <p className={`text-xs font-semibold truncate ${isSelected ? 'text-amber-200' : 'text-slate-300'}`}>
                {s.title.split(':')[1] || s.title}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active step display */}
      {(() => {
        const stepData = currentSteps.find((s) => s.step === activeStep) || currentSteps[0];
        return (
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 sm:p-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h4 className="text-base font-bold text-amber-300 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center text-xs font-bold">
                  {stepData.step}
                </span>
                {stepData.title}
              </h4>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> 매칭 평가기준
              </span>
            </div>

            <p className="text-sm text-slate-300 mb-3 leading-relaxed">
              {stepData.desc}
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 flex items-start gap-2">
                <Award className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-300">공식 기준: </span>
                  {stepData.criterionMatch}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-start gap-2">
                <Eye className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-sky-300">관찰 체크포인트: </span>
                  {stepData.checkpoint}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Official 4 Criteria Summary Box */}
      <div className="border-t border-slate-800/80 pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
          공식 평가기준 4대 핵심 체크리스트 ({shotType === 'middle' ? '미들슛' : '레이업슛'})
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {currentCriteria.map((c) => (
            <div
              key={c.id}
              className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/70 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 rounded-md bg-amber-400/20 text-amber-300 text-xs font-bold flex items-center justify-center">
                  {c.id}
                </span>
                <span className="font-bold text-xs text-slate-200">{c.shortName}</span>
              </div>
              <p className="text-xs text-slate-300 mb-2 leading-relaxed">{c.text}</p>
              <div className="text-[11px] text-amber-300/80 flex items-center gap-1">
                <span className="font-medium">포커스:</span> {c.focusArea}
              </div>
              <div className="text-[11px] text-rose-400/80 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span className="font-medium">주의:</span> {c.commonMistake}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
