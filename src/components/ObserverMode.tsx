import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Classroom,
  Student,
  FeedbackItem,
  ShotType,
  CriterionAssessment,
  MIDDLE_SHOT_CRITERIA,
  LAYUP_SHOT_CRITERIA
} from '../types';
import {
  Star,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Send,
  Sparkles,
  Check,
  Search,
  ChevronRight,
  Lightbulb,
  Calendar,
  Target,
  User,
  History
} from 'lucide-react';

interface Props {
  classes: Classroom[];
  students: Student[];
  feedbacks?: FeedbackItem[];
  activeSessions?: Record<string, number>;
  onSubmitFeedback: (payload: {
    id?: string;
    feedbackId?: string;
    classId: string;
    performerId: string;
    performerName: string;
    observerId: string;
    observerName: string;
    observerNumber?: number;
    shotType: ShotType;
    stars: number;
    criteriaResults: Record<number, CriterionAssessment>;
    comment: string;
    session?: number;
  }) => Promise<boolean>;
}

export const ObserverMode: React.FC<Props> = ({
  classes,
  students,
  feedbacks = [],
  activeSessions = {},
  onSubmitFeedback
}) => {
  // Navigation steps
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [observerStudentId, setObserverStudentId] = useState<string>('');
  const [targetStudentId, setTargetStudentId] = useState<string>('');
  const [selectedShotType, setSelectedShotType] = useState<ShotType>('middle');

  // Session state (차시: 교사 설정값 자동 반영)
  const [selectedSession, setSelectedSession] = useState<number>(1);

  // Search queries
  const [observerSearch, setObserverSearch] = useState<string>('');
  const [targetSearch, setTargetSearch] = useState<string>('');

  // Form states - always clean and ready for a fresh new observation
  const [stars, setStars] = useState<number>(3);
  const [criteriaResults, setCriteriaResults] = useState<Record<number, CriterionAssessment>>({
    1: 'good',
    2: 'good',
    3: 'good',
    4: 'good'
  });
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Initialize session when class is selected
  useEffect(() => {
    if (selectedClassId) {
      const active = activeSessions[selectedClassId];
      if (active && active > 0) {
        setSelectedSession(active);
      } else {
        setSelectedSession(1);
      }
    } else {
      setSelectedSession(1);
    }
  }, [selectedClassId, activeSessions]);

  // Filtered lists
  const classStudents = students.filter(s => s.classId === selectedClassId);
  const observerStudent = students.find(s => s.id === observerStudentId);
  const targetStudent = students.find(s => s.id === targetStudentId);

  const availableObservers = classStudents.filter(s =>
    s.name.toLowerCase().includes(observerSearch.toLowerCase()) ||
    String(s.number).includes(observerSearch)
  );

  // Available target students: exclude observer themselves
  const availableTargets = classStudents.filter(s =>
    s.id !== observerStudentId &&
    (s.name.toLowerCase().includes(targetSearch.toLowerCase()) ||
     String(s.number).includes(targetSearch))
  );

  const currentCriteria = selectedShotType === 'middle' ? MIDDLE_SHOT_CRITERIA : LAYUP_SHOT_CRITERIA;

  // Toggle criterion result
  const handleToggleCriterion = (cId: number, status: CriterionAssessment) => {
    setCriteriaResults(prev => ({
      ...prev,
      [cId]: prev[cId] === status ? 'none' : status
    }));
  };

  // Reset form inputs whenever target or shot changes
  const resetForm = () => {
    setStars(3);
    setCriteriaResults({ 1: 'good', 2: 'good', 3: 'good', 4: 'good' });
    setComment('');
  };

  // Reference feedback phrase examples for guidance
  const middleCommentExamples = [
    '무릎 반동을 부드럽게 잘 썼어요!',
    '슛 타점이 조금 낮아서 올리면 더 좋을 것 같아요.',
    '팔로우 스로우 끝까지 유지하는 자세가 멋져요!',
    '손목 스냅을 조금 더 채주면 공 회전이 살아나요.'
  ];

  const layupCommentExamples = [
    '1-2 스텝이 끊김없이 아주 정확했어요!',
    '백보드 사각형 상단 모서리를 정확히 조준했어요!',
    '점프 시 무릎을 더 높게 차올리면 체공 시간이 늘어나요.',
    '캐치 후 도약까지 연결 속도가 자연스러워요.'
  ];

  const commentExamples = selectedShotType === 'middle' ? middleCommentExamples : layupCommentExamples;

  // Submit feedback handler: ALWAYS creates and registers fresh peer observation feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observerStudent || !targetStudent) return;

    setIsSubmitting(true);
    try {
      const ok = await onSubmitFeedback({
        classId: selectedClassId,
        performerId: targetStudent.id,
        performerName: targetStudent.name,
        observerId: observerStudent.id,
        observerName: observerStudent.name,
        observerNumber: observerStudent.number,
        shotType: selectedShotType,
        stars,
        criteriaResults,
        comment: comment.trim(),
        session: selectedSession
      });

      if (ok) {
        setSubmitSuccess(true);
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#0ea5e9', '#f59e0b', '#fbbf24']
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Write another feedback
  const handleAnotherObservation = () => {
    setSubmitSuccess(false);
    setTargetStudentId('');
    resetForm();
  };

  // Action: Select a new observer
  const handleChangeObserver = () => {
    setSubmitSuccess(false);
    setObserverStudentId('');
    setTargetStudentId('');
    resetForm();
  };

  // Session Info Banner
  const renderSessionBar = () => {
    const activeSessionForClass = selectedClassId ? (activeSessions[selectedClassId] || 1) : 1;
    const sessionDisplay = activeSessionForClass === 0 ? '1차시 (전체 진행 중)' : `${activeSessionForClass}차시`;

    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 mb-5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Calendar className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">수업 차시</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black">
                  {sessionDisplay}
                </span>
                <span className="text-[10px] text-amber-400/80 bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 rounded-md font-medium">
                  체육선생님 지정
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                현재 체육선생님이 지정한 <strong className="text-amber-300">{selectedSession}차시</strong> 기준으로 피드백이 기록됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>선생님 설정 차시 자동 적용</span>
          </div>
        </div>
      </div>
    );
  };

  // 1. Step 1: Select Classroom
  if (!selectedClassId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>차시별 자세 관찰 & 상호 피드백</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
            별의별 피드백 : 학급 선택
          </h2>
          <p className="text-sm text-slate-400">
            먼저 본인이 속한 학급을 선택해주세요.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 max-w-3xl mx-auto">
          {classes.map((c) => {
            const studentCount = students.filter(s => s.classId === c.id).length;
            const classFeedbackCount = feedbacks.filter(f => f.classId === c.id).length;
            const activeSession = activeSessions[c.id] || 1;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedClassId(c.id);
                  setSelectedSession(activeSession);
                }}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-400/60 hover:bg-slate-850 transition-all text-left group shadow-lg cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-sm group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                    {c.name.match(/\d+반/) ? c.name.match(/\d+반/)?.[0] : c.name.slice(0, 3)}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-bold text-amber-300 border border-slate-700">
                    {activeSession}차시
                  </span>
                </div>
                <h3 className="font-extrabold text-white text-base mb-1 group-hover:text-amber-300 transition-colors">
                  {c.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>학생 {studentCount}명</span>
                  <span>&bull;</span>
                  <span>피드백 {classFeedbackCount}건</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Step 2: Select Observer Themselves
  if (!observerStudentId) {
    const currentClassObj = classes.find(c => c.id === selectedClassId);
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            type="button"
            onClick={() => setSelectedClassId('')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 학급 다시 선택
          </button>
          <span className="text-xs font-semibold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
            {currentClassObj?.name} &bull; 현재 {selectedSession}차시
          </span>
        </div>

        {renderSessionBar()}

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-400/10 text-sky-300 border border-sky-400/30 text-xs font-bold mb-2">
            <User className="w-3.5 h-3.5" />
            <span>1단계 : 관찰자 본인 선택</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-1">
            관찰자(본인)를 선택하세요
          </h2>
          <p className="text-sm text-slate-400">
            피드백을 작성할 <strong className="text-sky-300">본인의 번호와 이름</strong>을 선택해주세요.
          </p>
        </div>

        {/* Search bar */}
        <div className="max-w-md mx-auto mb-6 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={observerSearch}
            onChange={(e) => setObserverSearch(e.target.value)}
            placeholder="본인 이름 또는 번호 검색 (예: 1, 15, 민준)"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Observer List */}
        <div className="max-w-2xl mx-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-3 max-h-[460px] overflow-y-auto space-y-2">
          {availableObservers.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setObserverStudentId(s.id);
                resetForm();
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-sky-400/60 hover:bg-slate-900 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-black group-hover:bg-sky-400 group-hover:text-slate-950 transition-colors">
                  {s.number}번
                </span>
                <span className="font-extrabold text-sm text-slate-100 group-hover:text-sky-200">
                  {s.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-sky-400 font-bold">
                <span>내가 관찰자입니다</span>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-sky-300" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 3. Step 3: Select Target Student To Observe
  if (!targetStudentId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            type="button"
            onClick={() => {
              setObserverStudentId('');
              resetForm();
            }}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 관찰자 본인 변경
          </button>
          <div className="text-xs font-bold text-sky-300 bg-sky-400/10 px-3 py-1 rounded-lg border border-sky-400/20">
            관찰자: {observerStudent?.number}번 {observerStudent?.name}
          </div>
        </div>

        {renderSessionBar()}

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 text-xs font-bold mb-2">
            <Target className="w-3.5 h-3.5" />
            <span>2단계 : 관찰할 친구 선택</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-1">
            누구의 슛을 관찰하나요?
          </h2>
          <p className="text-sm text-slate-400">
            피드백을 줄 친구를 목록에서 자유롭게 선택하세요.
          </p>
        </div>

        {/* Search bar */}
        <div className="max-w-md mx-auto mb-6 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={targetSearch}
            onChange={(e) => setTargetSearch(e.target.value)}
            placeholder="관찰할 친구 이름 또는 번호 검색"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Target List */}
        <div className="max-w-3xl mx-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-3 max-h-[500px] overflow-y-auto space-y-2">
          {availableTargets.map((s) => {
            const myFeedbacksForThisTarget = feedbacks.filter(
              f => f.observerId === observerStudentId && f.performerId === s.id
            );

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setTargetStudentId(s.id);
                  resetForm();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/70 hover:border-amber-400/60 hover:bg-slate-900 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-black group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                    {s.number}번
                  </span>
                  <div>
                    <span className="font-extrabold text-sm text-slate-100 group-hover:text-amber-200 block">
                      {s.name}
                    </span>
                    {myFeedbacksForThisTarget.length > 0 && (
                      <span className="text-[11px] text-slate-400">
                        내가 보낸 피드백: {myFeedbacksForThisTarget.length}건
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                  <span>이 친구 관찰하기</span>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-300" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 4. Step 4: Submission Success Screen
  if (submitSuccess) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center relative z-10 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 text-xs font-bold mb-2">
          <span>{selectedSession}차시 피드백</span>
        </div>
        <h3 className="text-2xl font-extrabold text-white mb-2">
          별빛 피드백이 성공적으로 전송되었습니다!
        </h3>
        <p className="text-sm text-slate-300 mb-8 leading-relaxed">
          <strong className="text-amber-300">{targetStudent?.name}</strong> 친구에게{' '}
          <span className="font-bold text-amber-400">[{selectedSession}차시 {selectedShotType === 'middle' ? '미들 점프슛' : '돌파 레이업슛'}]</span> 별 {stars}개와 관찰 코멘트가 안전하게 저장되었습니다.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleAnotherObservation}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-400/20 cursor-pointer"
          >
            다른 친구 관찰하기
          </button>
          <button
            type="button"
            onClick={handleChangeObserver}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold transition-all border border-slate-700 cursor-pointer"
          >
            관찰자 변경하기
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetStudentId('');
              setObserverStudentId('');
              setSelectedClassId('');
              resetForm();
            }}
            className="w-full sm:w-auto px-4 py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-sm font-semibold transition-all cursor-pointer"
          >
            관찰 종료
          </button>
        </div>
      </div>
    );
  }

  // 5. Step 5: The Observation Form
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 relative z-10">
      {/* Navigation Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <button
          type="button"
          onClick={() => {
            setTargetStudentId('');
            resetForm();
          }}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> 관찰 대상 변경
        </button>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400">관찰자:</span>
          <span className="font-bold text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
            {observerStudent?.number}번 {observerStudent?.name}
          </span>
          <span className="text-slate-500">&rarr;</span>
          <span className="text-slate-400">수행자:</span>
          <span className="font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2.5 py-0.5 rounded">
            {targetStudent?.number}번 {targetStudent?.name}
          </span>
        </div>
      </div>

      {/* Compact Session Display */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">현재 수업 차시:</span>
          <span className="font-black text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
            {selectedSession}차시
          </span>
        </div>
        <span className="text-[11px] text-slate-500">선생님 지정 차시</span>
      </div>

      {/* Simple Clean Shot Type Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          type="button"
          onClick={() => setSelectedShotType('middle')}
          className={`py-3 px-4 rounded-xl border-2 text-center font-extrabold text-sm sm:text-base transition-all cursor-pointer flex items-center justify-center gap-2 ${
            selectedShotType === 'middle'
              ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <span>🏀</span>
          <span>미들슛</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedShotType('layup')}
          className={`py-3 px-4 rounded-xl border-2 text-center font-extrabold text-sm sm:text-base transition-all cursor-pointer flex items-center justify-center gap-2 ${
            selectedShotType === 'layup'
              ? 'bg-rose-500 border-rose-400 text-white shadow-md shadow-rose-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <span>🏃‍♂️</span>
          <span>레이업슛</span>
        </button>
      </div>

      {/* Observation Form Card */}
      <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">

        {/* 1. Official Criteria 4 Checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${selectedShotType === 'middle' ? 'bg-amber-400' : 'bg-rose-500'}`} />
              <span className="text-sm">
                [{selectedShotType === 'middle' ? '🏀 미들 점프슛' : '🏃‍♂️ 돌파 레이업슛'}] 4대 평가기준 관찰
              </span>
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              성공 여부를 버튼으로 탭하세요
            </span>
          </div>

          <div className="space-y-2.5">
            {currentCriteria.map((c) => {
              const currentStatus = criteriaResults[c.id] || 'good';
              return (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[11px] font-extrabold">
                        {c.id}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {c.shortName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed pl-7">
                      {c.text}
                    </p>
                  </div>

                  {/* Status buttons: Good / Bad */}
                  <div className="flex items-center gap-1.5 pl-7 sm:pl-0 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleCriterion(c.id, 'good')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        currentStatus === 'good'
                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      성공
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleCriterion(c.id, 'bad')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        currentStatus === 'bad'
                          ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/20'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      보완필요
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Star Rating (1 ~ 3 Stars) */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              부여할 별의 개수 (1 ~ 3개)
            </span>
            <span className="text-amber-400 font-extrabold text-sm">
              ★ {stars}개 선택됨
            </span>
          </label>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((val) => {
              const isSelected = stars === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStars(val)}
                  className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {Array.from({ length: val }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          isSelected ? 'text-amber-400 fill-amber-400' : 'text-slate-500'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-slate-400'}`}>
                    {val === 1 ? '노력해요 (1개)' : val === 2 ? '좋아요 (2개)' : '완벽해요 (3개)'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Feedback Text & Reference Examples */}
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>관찰 코멘트 직접 작성</span>
            </label>
            <span className="text-[11px] text-slate-400">솔직하고 건설적인 조언</span>
          </div>

          {/* Reference Examples */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                작성 참고 예시 ({selectedShotType === 'middle' ? '미들 점프슛' : '돌파 레이업슛'})
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                예시 참고용 &bull; 직접 작성
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {commentExamples.map((example, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/70 border border-slate-800/70 text-slate-300 text-[11px] leading-relaxed select-none"
                >
                  <span className="text-amber-400 font-bold shrink-0">&bull;</span>
                  <span>{example}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 pt-0.5">
              * 위 예시를 참고하여 친구의 장점이나 보완할 점을 아래 입력창에 <strong>직접 키보드로 작성</strong>해주세요.
            </p>
          </div>

          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="친구의 자세에서 눈에 띈 장점이나 고쳤으면 하는 점을 직접 적어주세요. (예: 슛 직전 무릎을 잘 굽혔는데 타점이 조금 낮았어!)"
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl font-black text-sm sm:text-base transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20"
          >
            <Send className="w-4 h-4" />
            {isSubmitting
              ? '피드백 저장 중...'
              : `${targetStudent?.name} 친구에게 [${selectedSession}차시] 별빛 피드백 보내기`}
          </button>
        </div>
      </form>
    </div>
  );
};
