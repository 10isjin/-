import React, { useState, useEffect, useMemo } from 'react';
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
  Crosshair,
  Star,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Send,
  Sparkles,
  HelpCircle,
  Check,
  Search,
  ChevronRight,
  Lightbulb,
  Edit3,
  Calendar,
  Layers,
  History,
  Clock,
  Plus
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

  // Form states
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
  const [lastSubmittedIsUpdate, setLastSubmittedIsUpdate] = useState<boolean>(false);

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

  // Find existing feedback for current (classId, performerId, observerId, shotType, session)
  const existingFeedback = useMemo(() => {
    if (!selectedClassId || !targetStudentId || !observerStudentId) return null;
    return feedbacks.find(f =>
      f.classId === selectedClassId &&
      f.performerId === targetStudentId &&
      f.observerId === observerStudentId &&
      f.shotType === selectedShotType &&
      (f.session || 1) === selectedSession
    ) || null;
  }, [feedbacks, selectedClassId, targetStudentId, observerStudentId, selectedShotType, selectedSession]);

  const isEditMode = Boolean(existingFeedback);

  // Populate form whenever target, shot type, or session changes
  useEffect(() => {
    if (existingFeedback) {
      setStars(existingFeedback.stars || 3);
      setCriteriaResults(existingFeedback.criteriaResults || { 1: 'good', 2: 'good', 3: 'good', 4: 'good' });
      setComment(existingFeedback.comment || '');
    } else {
      setStars(3);
      setCriteriaResults({ 1: 'good', 2: 'good', 3: 'good', 4: 'good' });
      setComment('');
    }
  }, [existingFeedback, targetStudentId, selectedShotType, selectedSession]);

  // Reference feedback phrase examples for guidance (not auto-filled)
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

  // Submit feedback handler (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observerStudent || !targetStudent) return;

    setIsSubmitting(true);
    try {
      const ok = await onSubmitFeedback({
        id: existingFeedback?.id,
        feedbackId: existingFeedback?.id,
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
        setLastSubmittedIsUpdate(isEditMode);
        setSubmitSuccess(true);
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: isEditMode ? ['#fbbf24', '#f59e0b', '#38bdf8'] : ['#38bdf8', '#0ea5e9', '#f59e0b']
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextObservation = () => {
    setSubmitSuccess(false);
    setTargetStudentId('');
    setComment('');
    setStars(3);
    setCriteriaResults({ 1: 'good', 2: 'good', 3: 'good', 4: 'good' });
  };

  // Helper component: Session Info Banner (교사 설정 차시 표시)
  const renderSessionBar = () => {
    const activeSessionForClass = selectedClassId ? (activeSessions[selectedClassId] || 1) : 1;
    const sessionDisplay = activeSessionForClass === 0 ? '1차시 (전체 진행 중)' : `${activeSessionForClass}차시`;

    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Calendar className="w-5 h-5" />
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
              <p className="text-[11px] text-slate-400 mt-1">
                현재 체육선생님이 지정한 <strong className="text-amber-300">{selectedSession}차시</strong> 기준으로 피드백이 기록됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
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
            관찰자 모드: 학급 선택
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
        <div className="flex items-center justify-between gap-4 mb-6">
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
          <h2 className="text-2xl font-extrabold text-white mb-1">
            별의별 피드백
          </h2>
          <p className="text-sm text-slate-400">
            관찰자 <strong className="text-amber-300">본인의 학번과 이름</strong>을 검색하거나 선택하세요.
          </p>
        </div>

        {/* Search bar */}
        <div className="max-w-md mx-auto mb-6 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={observerSearch}
            onChange={(e) => setObserverSearch(e.target.value)}
            placeholder="본인 이름 또는 번호 검색 (예: 강민준, 1)"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Observer List */}
        <div className="max-w-2xl mx-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-3 max-h-[460px] overflow-y-auto space-y-2">
          {availableObservers.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setObserverStudentId(s.id)}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-amber-400/50 hover:bg-slate-900 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                  {s.number}번
                </span>
                <span className="font-bold text-sm text-slate-100 group-hover:text-amber-200">
                  {s.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <span>내가 관찰자입니다</span>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-300" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 3. Step 3: Select Target Student To Observe (With Session History Badges & Edit Prompts)
  if (!targetStudentId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            type="button"
            onClick={() => setObserverStudentId('')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 관찰자 본인 변경
          </button>
          <div className="text-xs font-bold text-amber-300 bg-amber-400/10 px-3 py-1 rounded-lg border border-amber-400/20">
            관찰자: {observerStudent?.number}번 {observerStudent?.name}
          </div>
        </div>

        {/* Prominent Session Selector Bar */}
        {renderSessionBar()}

        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-white mb-1">
            관찰할 친구 선택
          </h2>
          <p className="text-sm text-slate-400">
            <strong className="text-amber-300">{selectedSession}차시</strong>에 자세를 관찰할 친구를 선택하세요.
            이미 작성한 피드백이 있다면 내용을 자유롭게 <span className="text-amber-400 font-bold">수정</span>할 수 있습니다.
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

        {/* Target List with Session Status Badges */}
        <div className="max-w-3xl mx-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-3 max-h-[500px] overflow-y-auto space-y-2.5">
          {availableTargets.map((s) => {
            // Check feedbacks sent by this observer to this target student
            const sentFeedbacksToTarget = feedbacks.filter(
              f => f.observerId === observerStudentId && f.performerId === s.id
            );

            // Feedbacks in current selected session
            const currentSessionFbs = sentFeedbacksToTarget.filter(
              f => (f.session || 1) === selectedSession
            );
            const hasCurrentSessionFb = currentSessionFbs.length > 0;

            // Past session history
            const pastSessions = Array.from(new Set(sentFeedbacksToTarget.map(f => f.session || 1))).sort((a, b) => a - b);

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setTargetStudentId(s.id)}
                className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all text-left group cursor-pointer gap-2.5 ${
                  hasCurrentSessionFb
                    ? 'bg-amber-950/20 border-amber-500/40 hover:bg-amber-950/30'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-amber-400/50 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 transition-colors ${
                    hasCurrentSessionFb
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-300 group-hover:bg-amber-400 group-hover:text-slate-950'
                  }`}>
                    {s.number}번
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-100 group-hover:text-amber-200">
                        {s.name}
                      </span>
                      {hasCurrentSessionFb ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          <Check className="w-3 h-3" />
                          {selectedSession}차시 작성완료 ({currentSessionFbs.length}건)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-semibold">
                          <Plus className="w-2.5 h-2.5" />
                          {selectedSession}차시 미작성
                        </span>
                      )}
                    </div>

                    {/* All sessions badges */}
                    {pastSessions.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                        <History className="w-3 h-3 text-slate-500" />
                        <span>작성 이력:</span>
                        {pastSessions.map(sess => {
                          const sessFbs = sentFeedbacksToTarget.filter(f => (f.session || 1) === sess);
                          const starsCount = sessFbs.reduce((sum, f) => sum + f.stars, 0);
                          return (
                            <span
                              key={sess}
                              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                                sess === selectedSession
                                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {sess}차시(★{starsCount})
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs shrink-0 self-end sm:self-center">
                  {hasCurrentSessionFb ? (
                    <span className="inline-flex items-center gap-1 text-amber-300 font-bold bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20 group-hover:bg-amber-400 group-hover:text-slate-950 transition-all">
                      <Edit3 className="w-3.5 h-3.5" />
                      피드백 수정하기
                    </span>
                  ) : (
                    <span className="text-slate-400 group-hover:text-amber-300 flex items-center gap-1">
                      <span>이 친구 관찰하기</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 4. Step 4: Observation Form & Criteria Checklist & 1~3 Stars (Create or Edit)
  if (submitSuccess) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center relative z-10 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 text-xs font-bold mb-2">
          <span>{selectedSession}차시 피드백</span>
        </div>
        <h3 className="text-2xl font-extrabold text-white mb-2">
          {lastSubmittedIsUpdate
            ? '피드백이 성공적으로 수정되었습니다!'
            : '별빛 피드백이 전송되었습니다!'}
        </h3>
        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          <strong className="text-amber-300">{targetStudent?.name}</strong> 친구에게{' '}
          <span className="font-bold text-amber-400">[{selectedSession}차시]</span> 별 {stars}개와 솔직한 관찰 코멘트가 반영되었습니다.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleNextObservation}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-amber-400/20 cursor-pointer"
          >
            다른 친구 관찰하기
          </button>
          <button
            type="button"
            onClick={() => setSubmitSuccess(false)}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-all border border-slate-700 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            방금 내용 다시 수정
          </button>
          <button
            type="button"
            onClick={() => { setTargetStudentId(''); setObserverStudentId(''); setSelectedClassId(''); }}
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-sm font-semibold transition-all cursor-pointer"
          >
            관찰 종료
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 relative z-10">
      {/* Navigation Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setTargetStudentId('')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> 관찰 대상 친구 변경
        </button>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400">관찰자:</span>
          <span className="font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
            {observerStudent?.name}
          </span>
          <span className="text-slate-500">&rarr;</span>
          <span className="text-slate-400">수행자:</span>
          <span className="font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2.5 py-0.5 rounded">
            {targetStudent?.number}번 {targetStudent?.name}
          </span>
        </div>
      </div>

      {/* Session Quick Switcher Banner */}
      {renderSessionBar()}

      {/* Observation Form Card */}
      <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
        {/* Header & Status Indicator */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-amber-400" />
                <span>별의별 피드백 {isEditMode ? '수정' : '작성'}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                공식 평가기준을 정밀하게 살펴보고 객관적으로 체크해주세요.
              </p>
            </div>

            {/* Shot Type Switch */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 self-start">
              <button
                type="button"
                onClick={() => {
                  setSelectedShotType('middle');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedShotType === 'middle'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🏀 미들슛
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedShotType('layup');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedShotType === 'layup'
                    ? 'bg-rose-500 text-white shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🏀 레이업슛
              </button>
            </div>
          </div>

          {/* Edit Mode Notice or New Feedback Notice */}
          {isEditMode ? (
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {targetStudent?.name} 친구에게 <strong>[{selectedSession}차시 {selectedShotType === 'middle' ? '미들슛' : '레이업슛'}]</strong> 피드백을 이미 보냈습니다. 아래에서 수정할 수 있습니다.
                </span>
              </div>
              <span className="text-[11px] text-amber-400/80 shrink-0">
                수정 모드
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center gap-2 text-xs text-sky-300 font-semibold">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                {targetStudent?.name} 친구의 <strong>[{selectedSession}차시 {selectedShotType === 'middle' ? '미들슛' : '레이업슛'}]</strong> 새로운 피드백을 작성합니다.
              </span>
            </div>
          )}
        </div>

        {/* 1. Official Criteria 4 Checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              {selectedShotType === 'middle' ? '미들슛' : '레이업슛'} 4대 평가기준 관찰 체크
            </label>
            <span className="text-[11px] text-slate-400">
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
                작성 참고 예시 ({selectedShotType === 'middle' ? '미들슛' : '레이업슛'})
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
            className={`w-full py-3.5 rounded-xl font-extrabold text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${
              isEditMode
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
            }`}
          >
            {isEditMode ? <Edit3 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {isSubmitting
              ? '피드백 저장 중...'
              : isEditMode
              ? `${targetStudent?.name} 친구에게 [${selectedSession}차시] 피드백 수정 완료하기`
              : `${targetStudent?.name} 친구에게 [${selectedSession}차시] 별빛 피드백 보내기`}
          </button>
        </div>
      </form>
    </div>
  );
};
