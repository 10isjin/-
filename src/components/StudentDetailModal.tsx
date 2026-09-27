import React, { useState } from 'react';
import { Student, FeedbackItem, AiEvaluation, ShotType } from '../types';
import { ShotGuideVisualizer } from './ShotGuideVisualizer';
import {
  X,
  Star,
  Award,
  Bot,
  Flame,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Heart,
  BookOpen,
  MessageSquare
} from 'lucide-react';

interface Props {
  student: Student;
  feedbacks: FeedbackItem[];
  aiEvaluations: Record<string, AiEvaluation>;
  onClose: () => void;
  onRequestAiFeedback: (performerId: string, performerName: string, shotType: ShotType) => Promise<AiEvaluation | null>;
}

export const StudentDetailModal: React.FC<Props> = ({
  student,
  feedbacks,
  aiEvaluations,
  onClose,
  onRequestAiFeedback
}) => {
  const [activeTab, setActiveTab] = useState<'materials' | 'feedbacks' | 'ai'>('materials');
  const [filterShot, setFilterShot] = useState<ShotType | 'all'>('all');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Filter feedbacks for this student
  const studentFeedbacks = feedbacks.filter(f => f.performerId === student.id);
  const displayFeedbacks = filterShot === 'all'
    ? studentFeedbacks
    : studentFeedbacks.filter(f => f.shotType === filterShot);

  // Breakdown of stars
  const peerStars = studentFeedbacks.filter(f => !f.isTeacher).reduce((sum, f) => sum + f.stars, 0);
  const teacherStars = studentFeedbacks.filter(f => f.isTeacher).reduce((sum, f) => sum + f.stars, 0);

  // Bonus stars this student earned by giving helpful feedback that peers rewarded!
  const rewardedStarsReceived = feedbacks.filter(f => f.observerId === student.id && f.favoriteRewarded).length;

  const totalAllStars = peerStars + teacherStars + rewardedStarsReceived;

  // AI evaluations for this student
  const middleAi = aiEvaluations[`${student.id}_middle`];
  const layupAi = aiEvaluations[`${student.id}_layup`];

  const handleAskAi = async (shotType: ShotType) => {
    setIsAiLoading(true);
    try {
      await onRequestAiFeedback(student.id, student.name, shotType);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center font-extrabold text-lg shadow-inner">
              {student.number}번
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-white">{student.name}</h3>
                <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  총 {totalAllStars}개 획득
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                학급별빛현황 &bull; 슛 자세 학습 자료 및 상세 피드백 열람
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Star Breakdown Banner */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-slate-950/40 border-b border-slate-800/80 text-center text-xs shrink-0">
          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <span className="text-slate-400 text-[11px] block">친구 관찰 별</span>
            <strong className="text-sky-300 font-extrabold text-sm sm:text-base">★ {peerStars}</strong>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <span className="text-slate-400 text-[11px] block">교사 지도 별</span>
            <strong className="text-rose-300 font-extrabold text-sm sm:text-base">★ {teacherStars}</strong>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
            <span className="text-slate-400 text-[11px] block">보답 감사 별</span>
            <strong className="text-amber-300 font-extrabold text-sm sm:text-base">★ {rewardedStarsReceived}</strong>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-950/20 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'materials'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            슛 자세 메커니즘 자료
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('feedbacks')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'feedbacks'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            받은 피드백 ({studentFeedbacks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'ai'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            AI 종합 리포트
          </button>
        </div>

        {/* Modal Body Content (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Tab 1: Posture & Mechanism Materials */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  농구 슛 자세 생체역학 가이드 및 평가기준 기준표
                </span>
                <span className="text-[11px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  수업 학습 자료
                </span>
              </div>
              <ShotGuideVisualizer initialShotType="middle" />
            </div>
          )}

          {/* Tab 2: Feedbacks List */}
          {activeTab === 'feedbacks' && (
            <div className="space-y-4">
              {/* Filter shot */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400 font-semibold">
                  총 {studentFeedbacks.length}건의 피드백
                </span>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterShot('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      filterShot === 'all' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    전체
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterShot('middle')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      filterShot === 'middle' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    미들슛
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterShot('layup')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      filterShot === 'layup' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    레이업슛
                  </button>
                </div>
              </div>

              {displayFeedbacks.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  등록된 피드백이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {displayFeedbacks.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-extrabold">
                            {f.session || 1}차시
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            f.isTeacher ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {f.isTeacher ? '선생님 지도' : `${f.observerName} 관찰`}
                          </span>
                          <span className="text-[11px] font-semibold text-amber-300">
                            {f.shotType === 'middle' ? '미들슛' : '레이업슛'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: f.stars }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                        {f.comment || '(별점 평가만 남김)'}
                      </p>

                      {f.favoriteRewarded && (
                        <div className="pt-2 border-t border-slate-800/60 flex items-center gap-1 text-[11px] text-amber-300">
                          <Heart className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>친구가 보답 별(1개)을 선물했습니다.</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: AI Rigorous Report */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* Middle Shot AI section */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    미들슛 AI 객관적 분석 리포트
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleAskAi('middle')}
                    disabled={isAiLoading || studentFeedbacks.filter(f => f.shotType === 'middle').length === 0}
                    className="text-xs px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {isAiLoading
                      ? '분석 중...'
                      : studentFeedbacks.filter(f => f.shotType === 'middle').length === 0
                      ? '피드백 없음'
                      : middleAi
                      ? '재분석'
                      : '분석 생성'}
                  </button>
                </div>

                {middleAi ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="font-semibold text-slate-300">종합 판정</span>
                      <span className="font-extrabold text-amber-300">{middleAi.overallGrade}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      {middleAi.summary}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/50">
                        <strong className="text-emerald-400 block mb-1">잘한 점</strong>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                          {middleAi.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                      <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/50">
                        <strong className="text-rose-400 block mb-1">아쉬운 점 (교정 필요)</strong>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                          {middleAi.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    {studentFeedbacks.filter(f => f.shotType === 'middle').length === 0
                      ? '아직 등록된 미들슛 관찰 피드백이 없습니다. 관찰자 모드에서 피드백을 먼저 받아보세요.'
                      : '상단의 [분석 생성] 버튼을 누르면 동료 피드백을 기반으로 한 AI 종합 분석이 즉시 작성됩니다.'}
                  </p>
                )}
              </div>

              {/* Layup Shot AI section */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    레이업슛 AI 객관적 분석 리포트
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleAskAi('layup')}
                    disabled={isAiLoading || studentFeedbacks.filter(f => f.shotType === 'layup').length === 0}
                    className="text-xs px-3 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {isAiLoading
                      ? '분석 중...'
                      : studentFeedbacks.filter(f => f.shotType === 'layup').length === 0
                      ? '피드백 없음'
                      : layupAi
                      ? '재분석'
                      : '분석 생성'}
                  </button>
                </div>

                {layupAi ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="font-semibold text-slate-300">종합 판정</span>
                      <span className="font-extrabold text-sky-300">{layupAi.overallGrade}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      {layupAi.summary}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/50">
                        <strong className="text-emerald-400 block mb-1">잘한 점</strong>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                          {layupAi.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                      <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/50">
                        <strong className="text-rose-400 block mb-1">아쉬운 점 (교정 필요)</strong>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                          {layupAi.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    {studentFeedbacks.filter(f => f.shotType === 'layup').length === 0
                      ? '아직 등록된 레이업슛 관찰 피드백이 없습니다. 관찰자 모드에서 피드백을 먼저 받아보세요.'
                      : '상단의 [분석 생성] 버튼을 누르면 동료 피드백을 기반으로 한 AI 종합 분석이 즉시 작성됩니다.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
