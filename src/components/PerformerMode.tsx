import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Classroom,
  Student,
  FeedbackItem,
  ShotType,
  AiEvaluation,
  TeacherQuestion,
  StudentAnswer,
  MIDDLE_SHOT_CRITERIA,
  LAYUP_SHOT_CRITERIA
} from '../types';
import { getDefaultSessionQuestions } from '../lib/defaultData';
import {
  Sparkles,
  Star,
  Flame,
  Bot,
  Award,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowLeft,
  Heart,
  ChevronRight,
  RefreshCw,
  Search,
  MessageSquareQuote,
  Send,
  Check,
  Edit3,
  Calendar,
  Lock,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { checkCleanBot, CleanBotResult } from '../lib/cleanBot';
import { CleanBotWarningModal } from './CleanBotWarningModal';

interface Props {
  classes: Classroom[];
  students: Student[];
  feedbacks: FeedbackItem[];
  aiEvaluations: Record<string, AiEvaluation>;
  activeSessions?: Record<string, number>;
  teacherQuestions?: Record<string, TeacherQuestion>;
  sessionQuestions?: Record<number, string>;
  classSessionQuestions?: Record<string, Record<number, string>>;
  studentAnswers?: Record<string, StudentAnswer>;
  onRewardFeedback: (feedbackId: string) => Promise<boolean>;
  onCancelRewardFeedback?: (feedbackId: string) => Promise<boolean>;
  onRequestAiFeedback: (performerId: string, performerName: string, shotType: ShotType) => Promise<AiEvaluation | null>;
  onSaveStudentAnswer?: (classId: string, studentId: string, answer: string, session?: number) => Promise<boolean>;
}

export const PerformerMode: React.FC<Props> = ({
  classes,
  students,
  feedbacks,
  aiEvaluations,
  activeSessions = {},
  teacherQuestions = {},
  sessionQuestions = {},
  classSessionQuestions = {},
  studentAnswers = {},
  onRewardFeedback,
  onCancelRewardFeedback,
  onRequestAiFeedback,
  onSaveStudentAnswer
}) => {
  // Navigation states
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedShotType, setSelectedShotType] = useState<ShotType | null>(null);

  // Selected session for viewing past/current feedbacks ('teacher_current' | 'all' | number)
  const [selectedViewSession, setSelectedViewSession] = useState<number | 'all' | 'teacher_current'>('teacher_current');

  // Reset to teacher's current session when student or class changes
  useEffect(() => {
    setSelectedViewSession('teacher_current');
  }, [selectedClassId, selectedStudentId]);

  // Lesson session is strictly designated by the teacher in Teacher Mode (Writing is locked to this session)
  const teacherSession = (selectedClassId && activeSessions[selectedClassId] !== undefined)
    ? activeSessions[selectedClassId]
    : 1;
  const isAllSessions = teacherSession === 0;

  // Student search/filter in selected class
  const [studentSearch, setStudentSearch] = useState<string>('');

  // AI request loading state
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [rewardLoadingId, setRewardLoadingId] = useState<string | null>(null);
  const [cancelRewardLoadingId, setCancelRewardLoadingId] = useState<string | null>(null);
  const [confirmCancelFbId, setConfirmCancelFbId] = useState<string | null>(null);
  const [rewardNoticeMsg, setRewardNoticeMsg] = useState<string>('');

  // Filtered students for current class
  const classStudents = students.filter(s => s.classId === selectedClassId);
  const filteredStudents = classStudents.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    String(s.number).includes(studentSearch)
  );

  const currentStudent = students.find(s => s.id === selectedStudentId);

  // All feedbacks for this student and shot
  const allStudentFeedbacksForShot = feedbacks.filter(f =>
    f.performerId === selectedStudentId &&
    (!selectedShotType || f.shotType === selectedShotType)
  );

  // Cumulative all-time feedbacks for reference
  const allMiddleFeedbacks = feedbacks.filter(f => f.performerId === selectedStudentId && f.shotType === 'middle');
  const allLayupFeedbacks = feedbacks.filter(f => f.performerId === selectedStudentId && f.shotType === 'layup');
  const middleTotalCount = allMiddleFeedbacks.length;
  const layupTotalCount = allLayupFeedbacks.length;

  const middleCurrentCount = feedbacks.filter(f =>
    f.performerId === selectedStudentId &&
    f.shotType === 'middle' &&
    (isAllSessions || (f.session || 1) === teacherSession)
  ).length;

  const layupCurrentCount = feedbacks.filter(f =>
    f.performerId === selectedStudentId &&
    f.shotType === 'layup' &&
    (isAllSessions || (f.session || 1) === teacherSession)
  ).length;

  const middleTotalStars = allMiddleFeedbacks.reduce((sum, f) => sum + f.stars, 0);
  const layupTotalStars = allLayupFeedbacks.reduce((sum, f) => sum + f.stars, 0);

  // Available sessions where feedback exists for this student and shot
  const recordedSessions = Array.from(new Set(allStudentFeedbacksForShot.map(f => f.session || 1))).sort((a, b) => a - b);

  // Past / other sessions available for viewing:
  const pastSessions = Array.from(new Set([
    ...recordedSessions.filter(s => isAllSessions || s !== teacherSession),
    ...(!isAllSessions && teacherSession > 1 ? Array.from({ length: teacherSession - 1 }, (_, i) => i + 1) : [])
  ])).sort((a, b) => a - b);

  // Effective session being viewed
  const effectiveSession: number | 'all' = selectedViewSession === 'teacher_current'
    ? (isAllSessions ? 'all' : teacherSession)
    : selectedViewSession;

  // Filter feedbacks to display based on the selected viewing session
  const studentFeedbacks = allStudentFeedbacksForShot.filter(f =>
    effectiveSession === 'all' || (f.session || 1) === effectiveSession
  );

  // Feedbacks strictly for Teacher's currently designated session
  const currentTeacherSessionFeedbacks = allStudentFeedbacksForShot.filter(f =>
    isAllSessions || (f.session || 1) === teacherSession
  );

  // Total stars calculation
  const totalStarsForShot = studentFeedbacks.reduce((sum, f) => sum + f.stars, 0);
  const cumulativeStarsForShot = allStudentFeedbacksForShot.reduce((sum, f) => sum + f.stars, 0);

  // Check if AI analysis exists
  const aiCacheKey = selectedStudentId && selectedShotType ? `${selectedStudentId}_${selectedShotType}` : '';
  const existingAiEval = aiCacheKey ? aiEvaluations[aiCacheKey] : null;

  // Handle reward 1 star back to friend
  const handleReward = async (fId: string) => {
    setRewardLoadingId(fId);
    try {
      const ok = await onRewardFeedback(fId);
      if (ok) {
        // Trigger celebratory star confetti
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#f59e0b', '#fbbf24', '#eab308']
        });
      }
    } finally {
      setRewardLoadingId(null);
    }
  };

  // Handle canceling rewarded star (no window.confirm to avoid iframe sandbox blockers)
  const executeCancelReward = async (fId: string, observerName?: string) => {
    if (!onCancelRewardFeedback) return;
    setCancelRewardLoadingId(fId);
    try {
      const ok = await onCancelRewardFeedback(fId);
      if (ok) {
        setConfirmCancelFbId(null);
        setRewardNoticeMsg(
          observerName
            ? `${observerName} 친구에게 보낸 보답 별이 성공적으로 취소(회수)되었습니다.`
            : '보답 별 전달이 성공적으로 취소되었습니다.'
        );
        setTimeout(() => setRewardNoticeMsg(''), 4000);
      }
    } finally {
      setCancelRewardLoadingId(null);
    }
  };

  // AI Notice & Error Messages
  const [aiNoticeMsg, setAiNoticeMsg] = useState<string>('');
  const [aiErrorMsg, setAiErrorMsg] = useState<string>('');

  // Handle AI analysis request
  const handleAskAi = async () => {
    if (!currentStudent || !selectedShotType) return;
    setAiNoticeMsg('');
    setAiErrorMsg('');

    if (allStudentFeedbacksForShot.length === 0) {
      setAiErrorMsg('아직 등록된 친구나 선생님의 관찰 피드백이 없습니다. 먼저 관찰자 모드에서 피드백을 1건 이상 받아보세요!');
      setTimeout(() => setAiErrorMsg(''), 5000);
      return;
    }

    setIsAiLoading(true);
    try {
      const res = await onRequestAiFeedback(currentStudent.id, currentStudent.name, selectedShotType);
      if (res) {
        setAiNoticeMsg('AI 종합 분석이 성공적으로 생성되었습니다!');
        setTimeout(() => setAiNoticeMsg(''), 4000);
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#f59e0b', '#3b82f6']
        });
      } else {
        setAiErrorMsg('AI 분석 요청 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch (err: any) {
      setAiErrorMsg('오류 발생: ' + (err.message || '네트워크 오류'));
    } finally {
      setIsAiLoading(false);
    }
  };

  const currentCriteria = selectedShotType === 'middle' ? MIDDLE_SHOT_CRITERIA : LAYUP_SHOT_CRITERIA;

  // Student Daily Question Answer State (Automatic linkage with active class session)
  const activeSessionForClass = selectedClassId ? (activeSessions[selectedClassId] || 1) : 1;
  const classSpecificSessionQ = (selectedClassId && classSessionQuestions[selectedClassId]?.[activeSessionForClass]) || '';
  const customQObj = selectedClassId ? teacherQuestions[selectedClassId] : undefined;
  // Use custom class question if session matches or legacy class question exists
  const legacyClassQuestion = (customQObj && (!customQObj.session || customQObj.session === activeSessionForClass))
    ? customQObj.question
    : '';
  const globalSessionQuestion = sessionQuestions[activeSessionForClass] || '';
  const currentClassQuestion = classSpecificSessionQ || legacyClassQuestion || globalSessionQuestion || '';

  const sessionAnswerKey = selectedClassId && selectedStudentId ? `${selectedClassId}_${selectedStudentId}_s${activeSessionForClass}` : '';
  const legacyAnswerKey = selectedClassId && selectedStudentId ? `${selectedClassId}_${selectedStudentId}` : '';
  const existingStudentAnswer = (sessionAnswerKey && studentAnswers[sessionAnswerKey]) || (legacyAnswerKey && studentAnswers[legacyAnswerKey]) || null;
  const studentAnswerKey = sessionAnswerKey || legacyAnswerKey;

  const [answerInput, setAnswerInput] = useState<string>('');
  const [cleanBotResult, setCleanBotResult] = useState<CleanBotResult | null>(null);
  const [isAnswerSubmitting, setIsAnswerSubmitting] = useState<boolean>(false);
  const [answerSuccessMsg, setAnswerSuccessMsg] = useState<string>('');
  const [isEditingAnswer, setIsEditingAnswer] = useState<boolean>(false);

  // Track student selection to avoid periodic auto-refresh wiping answer input while typing
  const lastLoadedStudentAnswerKeyRef = useRef<string>('');
  const isAnswerDirtyRef = useRef<boolean>(false);

  // Sync existing student answer ONLY when student changes or server answer updates (if user hasn't typed anything)
  useEffect(() => {
    if (studentAnswerKey !== lastLoadedStudentAnswerKeyRef.current) {
      lastLoadedStudentAnswerKeyRef.current = studentAnswerKey;
      isAnswerDirtyRef.current = false;
      if (existingStudentAnswer?.answer) {
        setAnswerInput(existingStudentAnswer.answer);
        setIsEditingAnswer(false);
      } else {
        setAnswerInput('');
        setIsEditingAnswer(true);
      }
    } else if (!isAnswerDirtyRef.current) {
      if (existingStudentAnswer?.answer) {
        setAnswerInput(existingStudentAnswer.answer);
      }
    }
  }, [studentAnswerKey, existingStudentAnswer?.answer]);

  // Handle saving student answer
  const handleSaveAnswer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentStudent || !selectedClassId || !onSaveStudentAnswer) return;
    if (!answerInput.trim()) {
      alert('답변 내용을 입력해주세요.');
      return;
    }

    // CleanBot Validation
    const cleanCheck = checkCleanBot(answerInput);
    if (!cleanCheck.isValid) {
      setCleanBotResult(cleanCheck);
      return;
    }

    setIsAnswerSubmitting(true);
    const ok = await onSaveStudentAnswer(
      selectedClassId,
      currentStudent.id,
      answerInput.trim(),
      activeSessionForClass
    );
    setIsAnswerSubmitting(false);

    if (ok) {
      isAnswerDirtyRef.current = false;
      setIsEditingAnswer(false);
      setAnswerSuccessMsg('선생님의 오늘의 질문에 대한 답변이 성공적으로 제출되었습니다!');
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#fbbf24', '#34d399']
      });
      setTimeout(() => setAnswerSuccessMsg(''), 4000);
    }
  };

  // 1. Step 1: Select Classroom
  if (!selectedClassId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            수행자 모드
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            슈팅스타, 별을 쏘다
          </h2>
          <p className="text-sm text-slate-400">
            먼저 관찰 피드백을 확인할 <strong className="text-amber-300">본인의 학급</strong>을 선택해주세요.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 max-w-4xl mx-auto">
          {classes.map((c) => {
            const count = students.filter(s => s.classId === c.id).length;
            const badgeText = c.name.match(/\d+반/) ? c.name.match(/\d+반/)?.[0] : c.name.slice(0, 3);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClassId(c.id)}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-400/60 hover:bg-slate-900 transition-all text-left group shadow-lg hover:-translate-y-0.5 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="px-2.5 py-1 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center font-extrabold text-xs">
                    {badgeText}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-amber-200 mb-0.5">
                  {c.name}
                </h3>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-xs">
                  <span className="text-slate-400">
                    {count > 0 ? `학생 ${count}명` : '명렬표 준비중'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    {activeSessions[c.id] === 0 ? '전체 차시' : `${activeSessions[c.id] || 1}차시`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Step 2: Select Student (Scroll & Search)
  if (!selectedStudentId) {
    const currentClassObj = classes.find(c => c.id === selectedClassId);
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            type="button"
            onClick={() => setSelectedClassId('')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 학급 다시 선택
          </button>
          <span className="text-xs font-semibold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
            {currentClassObj?.name}
          </span>
        </div>

        {/* High-Contrast Teacher Daily Question Banner for selected class */}
        {currentClassQuestion && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-amber-400 text-slate-950 border-2 border-amber-300 shadow-xl shadow-amber-400/10 flex items-start gap-3.5 animate-fadeIn">
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 shadow-md">
              <MessageSquareQuote className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider bg-slate-950 text-amber-300 px-2.5 py-0.5 rounded-full shadow-sm">
                  오늘 선생님의 질문 ({currentClassObj?.name} &bull; {activeSessionForClass}차시)
                </span>
                <span className="text-xs font-bold text-slate-800">
                  아래에서 본인 이름을 선택한 후 답변을 작성할 수 있습니다
                </span>
              </div>
              <p className="text-sm sm:text-base font-extrabold text-slate-950 leading-relaxed whitespace-pre-wrap">
                {currentClassQuestion}
              </p>
            </div>
          </div>
        )}

        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-white mb-1">
            슈팅스타, 별을 쏘다
          </h2>
          <p className="text-sm text-slate-400">
            본인의 <strong className="text-amber-300">학번과 이름</strong>을 목록에서 스크롤하거나 검색하여 선택하세요.
          </p>
        </div>

        {/* Search bar */}
        <div className="max-w-md mx-auto mb-6 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="이름 또는 번호 검색 (예: 김도윤, 1)"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Student Scrollable List */}
        <div className="max-w-2xl mx-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-3 max-h-[460px] overflow-y-auto space-y-2">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              일치하는 학생이 없습니다.
            </div>
          ) : (
            filteredStudents.map((s) => {
              const myFeedbacks = feedbacks.filter(f => f.performerId === s.id);
              const starCount = myFeedbacks.reduce((sum, f) => sum + f.stars, 0);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStudentId(s.id)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-amber-400/50 hover:bg-slate-900 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                      {s.number}번
                    </span>
                    <span className="font-bold text-sm text-slate-100 group-hover:text-amber-200">
                      {s.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      별 <strong className="text-white">{starCount}</strong>개
                    </span>
                    <span className="text-xs text-slate-500">
                      (피드백 {myFeedbacks.length}건)
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-300" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // 3. Step 3: Select Shot Type (미들슛 vs 레이업슛)
  if (!selectedShotType) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            type="button"
            onClick={() => setSelectedStudentId('')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 학생 다시 선택
          </button>
          <div className="text-xs font-bold text-amber-300 bg-amber-400/10 px-3 py-1 rounded-lg border border-amber-400/20">
            {currentStudent?.number}번 {currentStudent?.name}
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-white mb-2">
            슈팅스타, 별을 쏘다
          </h2>
          <p className="text-sm text-slate-400">
            피드백을 확인할 <strong className="text-amber-300">슛의 종류</strong>를 선택하거나, <strong className="text-white">선생님의 오늘 질문</strong>에 답변을 남겨보세요.
          </p>
        </div>

        {/* Teacher Daily Question & Student Answer Interactive Box */}
        {currentClassQuestion && (
          <div className="max-w-2xl mx-auto mb-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-300 to-amber-400 text-slate-950 border-2 border-amber-200 shadow-2xl shadow-amber-400/20">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-300 flex items-center justify-center shrink-0 shadow-md">
                <MessageSquareQuote className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[11px] font-black uppercase tracking-wider bg-slate-950 text-amber-300 px-2.5 py-0.5 rounded-full">
                    오늘 체육 선생님의 질문
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    ({classes.find(c => c.id === selectedClassId)?.name} &bull; {activeSessionForClass}차시)
                  </span>
                </div>
                <p className="text-sm sm:text-base font-black text-slate-950 leading-relaxed whitespace-pre-wrap">
                  {currentClassQuestion}
                </p>
              </div>
            </div>

            {/* Success toast inside card */}
            {answerSuccessMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950 text-emerald-300 text-xs font-bold flex items-center gap-2 border border-emerald-500/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{answerSuccessMsg}</span>
              </div>
            )}

            {/* Answer Input or Submitted State */}
            {existingStudentAnswer && !isEditingAnswer ? (
              <div className="p-4 rounded-xl bg-slate-950 text-white border border-slate-900 shadow-inner space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 나의 답변 제출 완료
                  </span>
                  <span className="text-[11px] text-slate-400">
                    제출일시: {new Date(existingStudentAnswer.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  {existingStudentAnswer.answer}
                </p>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingAnswer(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> 답변 수정하기
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveAnswer} className="space-y-3">
                <div className="relative">
                  <textarea
                    rows={3}
                    value={answerInput}
                    onChange={(e) => {
                      isAnswerDirtyRef.current = true;
                      setAnswerInput(e.target.value);
                    }}
                    placeholder="선생님의 질문에 대한 나의 생각이나 오늘 슛 연습에서 깨달은 점을 적어보세요..."
                    className="w-full p-3.5 rounded-xl bg-slate-950 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 leading-relaxed border border-slate-900"
                  />
                  {/* CleanBot Safe Education Badge */}
                  <div className="flex items-center justify-between text-[11px] pt-1.5 px-0.5 text-slate-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
                      클린봇 안전 필터 가동 중
                    </span>
                    <span className="text-[10px] text-slate-800">
                      욕설 및 성적 비하 표현 자동 제재
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold text-slate-900">
                    선생님이 교사 모드에서 실시간으로 확인할 수 있습니다.
                  </span>
                  <div className="flex items-center gap-2">
                    {existingStudentAnswer && (
                      <button
                        type="button"
                        onClick={() => {
                          isAnswerDirtyRef.current = false;
                          setAnswerInput(existingStudentAnswer.answer);
                          setIsEditingAnswer(false);
                        }}
                        className="px-3 py-2 rounded-xl text-slate-900 hover:text-slate-950 font-bold text-xs"
                      >
                        취소
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isAnswerSubmitting || !answerInput.trim()}
                      className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 font-extrabold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5 text-amber-400" />
                      {isAnswerSubmitting ? '제출 중...' : existingStudentAnswer ? '수정된 답변 저장' : '답변 제출하기'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
          {/* Middle Shot Card */}
          <button
            type="button"
            onClick={() => setSelectedShotType('middle')}
            className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-400 hover:bg-slate-900 transition-all text-left group shadow-xl hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4">
              <Flame className="w-6 h-6" />
            </div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-xl font-bold text-white group-hover:text-amber-300">
                미들슛 (Middle Shot)
              </h3>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs text-amber-400 font-bold bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                  {isAllSessions ? `피드백 ${middleTotalCount}건` : `현재 ${teacherSession}차시: ${middleCurrentCount}건`}
                </span>
                {!isAllSessions && middleTotalCount > middleCurrentCount && (
                  <span className="text-[10px] text-amber-300/80 font-semibold">
                    (과거 차시 {middleTotalCount - middleCurrentCount}건 보관됨)
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              무릎 반동, 높은 릴리스 타점, 팔로우 스로우, 손목 스냅을 평가한 피드백을 확인합니다.
            </p>
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-amber-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <span>피드백 및 지난 차시 기록 열람하기</span>
                {middleTotalCount > 0 && (
                  <span className="text-[11px] text-slate-400 font-normal">
                    (누적 {middleTotalCount}건 &bull; ★{middleTotalStars}개)
                  </span>
                )}
              </span>
              <span>&rarr;</span>
            </div>
          </button>

          {/* Layup Shot Card */}
          <button
            type="button"
            onClick={() => setSelectedShotType('layup')}
            className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-sky-400 hover:bg-slate-900 transition-all text-left group shadow-xl hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-xl font-bold text-white group-hover:text-sky-300">
                레이업슛 (Layup Shot)
              </h3>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs text-sky-400 font-bold bg-sky-400/10 px-2.5 py-0.5 rounded-full border border-sky-400/20">
                  {isAllSessions ? `피드백 ${layupTotalCount}건` : `현재 ${teacherSession}차시: ${layupCurrentCount}건`}
                </span>
                {!isAllSessions && layupTotalCount > layupCurrentCount && (
                  <span className="text-[10px] text-sky-300/80 font-semibold">
                    (과거 차시 {layupTotalCount - layupCurrentCount}건 보관됨)
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              드리블-캐치 스텝, 백보드 겨냥점, 수직 무릎 리프트, 연결 동작을 평가한 피드백을 확인합니다.
            </p>
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-sky-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <span>피드백 및 지난 차시 기록 열람하기</span>
                {layupTotalCount > 0 && (
                  <span className="text-[11px] text-slate-400 font-normal">
                    (누적 {layupTotalCount}건 &bull; ★{layupTotalStars}개)
                  </span>
                )}
              </span>
              <span>&rarr;</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // 4. Step 4: Feedback list + AI feedback integration
  const shotTypeName = selectedShotType === 'middle' ? '미들슛' : '레이업슛';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
      {/* Top Bar Navigation & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedShotType(null)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 슛 유형 변경
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white px-2.5 py-1 rounded-lg bg-slate-800">
              {currentStudent?.number}번 {currentStudent?.name}
            </span>
            <span className="text-xs font-bold text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2.5 py-1 rounded-lg">
              {shotTypeName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>
              {selectedViewSession === 'all' ? '누적 총 별: ' : `${effectiveSession}차시 별: `}
              <strong className="text-amber-300 text-sm">{totalStarsForShot}</strong>개
            </span>
            {selectedViewSession !== 'all' && (
              <span className="text-[11px] text-slate-400 ml-1">
                (누적 ★{cumulativeStarsForShot}개)
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400">
            피드백 <strong className="text-white">{studentFeedbacks.length}</strong>건
            {selectedViewSession !== 'all' && (
              <span className="text-slate-500 ml-1">(누적 {allStudentFeedbacksForShot.length}건)</span>
            )}
          </div>
        </div>
      </div>

      {/* High-Contrast Question Banner in Step 4 if question exists */}
      {currentClassQuestion && (
        <div className="mb-6 p-4 rounded-xl bg-amber-400 text-slate-950 border border-amber-300 shadow-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-950 text-amber-300 flex items-center justify-center shrink-0">
              <MessageSquareQuote className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-950 text-amber-300 px-2 py-0.5 rounded mr-2">
                오늘의 질문
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-950">
                {currentClassQuestion}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedShotType(null)}
            className="text-xs font-bold text-slate-950 hover:underline shrink-0 bg-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30 cursor-pointer"
          >
            {existingStudentAnswer ? '내 답변 확인/수정' : '답변 작성하기'} &rarr;
          </button>
        </div>
      )}

      {/* Main Layout: Feedbacks on Left, AI Rigorous Synthesis on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Peer & Teacher Feedbacks */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>
                {selectedViewSession === 'all'
                  ? `전체 차시 누적 피드백 (${studentFeedbacks.length}건)`
                  : selectedViewSession === 'teacher_current'
                  ? `선생님 지정 [${teacherSession}차시] 피드백 (${studentFeedbacks.length}건)`
                  : `지난 [${selectedViewSession}차시] 피드백 (${studentFeedbacks.length}건)`}
              </span>
            </h3>
            <span className="text-[11px] text-slate-400">
              마음에 드는 피드백에 별(1개)을 보답하세요!
            </span>
          </div>

          {/* Session Viewing Filter Bar: Allows students to inspect past sessions or all-time cumulative feedback */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-extrabold text-white">피드백 열람 차시 선택</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                  과거 기록 영구 보관됨
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500">체육선생님 지정 수업:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/15 text-amber-300 font-extrabold border border-amber-400/30 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  {isAllSessions ? '전체 차시 보기' : `${teacherSession}차시`}
                </span>
              </div>
            </div>

            {/* Session Navigation Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Teacher current session */}
              {!isAllSessions && (
                <button
                  type="button"
                  onClick={() => setSelectedViewSession('teacher_current')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedViewSession === 'teacher_current'
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>현재 {teacherSession}차시</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedViewSession === 'teacher_current'
                      ? 'bg-slate-950/20 text-slate-900 font-extrabold'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {currentTeacherSessionFeedbacks.length}건
                  </span>
                </button>
              )}

              {/* All sessions cumulative */}
              <button
                type="button"
                onClick={() => setSelectedViewSession('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedViewSession === 'all'
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                    : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                <span>전체 차시 누적 모아보기</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedViewSession === 'all'
                    ? 'bg-slate-950/20 text-slate-900 font-extrabold'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {allStudentFeedbacksForShot.length}건 &bull; ★{cumulativeStarsForShot}
                </span>
              </button>

              {/* Past sessions buttons */}
              {pastSessions.map(sessNum => {
                const sessCount = allStudentFeedbacksForShot.filter(f => (f.session || 1) === sessNum).length;
                const sessStars = allStudentFeedbacksForShot.filter(f => (f.session || 1) === sessNum).reduce((sum, f) => sum + f.stars, 0);
                const isSelected = selectedViewSession === sessNum;

                return (
                  <button
                    key={sessNum}
                    type="button"
                    onClick={() => setSelectedViewSession(sessNum)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                        : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>지난 {sessNum}차시 피드백</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-slate-950/20 text-slate-900 font-extrabold'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {sessCount}건{sessStars > 0 ? ` (★${sessStars})` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banner explaining active viewing session */}
          {selectedViewSession !== 'teacher_current' && (
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 flex flex-wrap items-center justify-between gap-2.5 text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-amber-200">
                  {selectedViewSession === 'all' ? (
                    <>
                      현재 <strong>[전체 차시 누적 피드백]</strong>을 열람하고 있습니다. (피드백 <strong className="text-white">{studentFeedbacks.length}</strong>건, 받은 별 <strong className="text-amber-300">★{totalStarsForShot}</strong>개)
                    </>
                  ) : (
                    <>
                      과거 <strong>[{selectedViewSession}차시]</strong> 수업 피드백을 열람하고 있습니다. (피드백 <strong className="text-white">{studentFeedbacks.length}</strong>건, 받은 별 <strong className="text-amber-300">★{totalStarsForShot}</strong>개)
                    </>
                  )}
                </span>
              </div>
              {!isAllSessions && (
                <button
                  type="button"
                  onClick={() => setSelectedViewSession('teacher_current')}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[11px] shrink-0 transition-colors cursor-pointer"
                >
                  현재 {teacherSession}차시로 돌아가기 &rarr;
                </button>
              )}
            </div>
          )}

          {/* Notification when reward is canceled */}
          {rewardNoticeMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between animate-in fade-in shadow-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{rewardNoticeMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setRewardNoticeMsg('')}
                className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {studentFeedbacks.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 text-center text-slate-400">
              <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300 mb-1">
                {selectedViewSession === 'all'
                  ? `아직 등록된 ${shotTypeName} 피드백이 없습니다.`
                  : selectedViewSession === 'teacher_current'
                  ? `선생님이 지정한 현재 [${teacherSession}차시] ${shotTypeName} 피드백이 아직 없습니다.`
                  : `선택하신 과거 [${selectedViewSession}차시] ${shotTypeName} 피드백이 없습니다.`}
              </p>
              <p className="text-xs text-slate-500 mb-4">
                {selectedViewSession === 'teacher_current' && allStudentFeedbacksForShot.length > 0 ? (
                  <>
                    이전 다른 차시에 받은 피드백(총 {allStudentFeedbacksForShot.length}건, 별 ★{cumulativeStarsForShot}개)이 안전하게 보관되어 있습니다. 아래 버튼을 눌러 지난 피드백을 바로 확인해보세요!
                  </>
                ) : (
                  '관찰자 모드에서 친구에게 자세 관찰을 요청해보세요!'
                )}
              </p>
              {selectedViewSession === 'teacher_current' && allStudentFeedbacksForShot.length > 0 && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedViewSession('all')}
                    className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs hover:bg-amber-300 cursor-pointer shadow-md inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>누적 피드백 전체 모아보기 ({allStudentFeedbacksForShot.length}건)</span>
                  </button>
                  {pastSessions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedViewSession(pastSessions[pastSessions.length - 1])}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 cursor-pointer border border-slate-700"
                    >
                      지난 {pastSessions[pastSessions.length - 1]}차시 피드백 보기 &rarr;
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            studentFeedbacks.map((item) => {
              const isRewardDisabled = item.favoriteRewarded || rewardLoadingId === item.id;
              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    item.isTeacher
                      ? 'bg-gradient-to-br from-rose-950/20 to-slate-900/80 border-rose-800/50 shadow-md'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Feedback Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-extrabold">
                        {item.session || 1}차시
                      </span>
                      {item.isTeacher ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded bg-rose-500 text-white shadow-sm">
                          교사 지도
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.observerNumber ? `${item.observerNumber}번 ` : ''}{item.observerName}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">
                        {new Date(item.timestamp).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}{' '}
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {item.updatedAt && (
                        <span className="text-[10px] text-amber-400/80 font-medium">
                          (수정됨)
                        </span>
                      )}
                    </div>

                    {/* Star Rating Badge */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3].map((starIdx) => (
                        <Star
                          key={starIdx}
                          className={`w-4 h-4 ${
                            starIdx <= item.stars
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Criteria Assessment Chips */}
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {currentCriteria.map((c) => {
                      const res = item.criteriaResults[c.id];
                      const isGood = res === 'good';
                      const isBad = res === 'bad';

                      return (
                        <div
                          key={c.id}
                          className={`flex items-center justify-between px-2 py-1 rounded text-[11px] border ${
                            isGood
                              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                              : isBad
                              ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                              : 'bg-slate-950/40 border-slate-800 text-slate-500'
                          }`}
                        >
                          <span className="truncate">{c.shortName}</span>
                          <span className="font-bold shrink-0 ml-1">
                            {isGood ? '성공' : isBad ? '보완필요' : '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Comment Text */}
                  <p className="text-xs sm:text-sm text-slate-200 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-3.5 leading-relaxed">
                    {item.comment || '(별점 평가만 남김)'}
                  </p>

                  {/* Favorite Reward Button (보답 별 1개 주기) */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <span className="text-[11px] text-slate-400">
                      {item.isTeacher ? '선생님 피드백' : '친구의 관찰 조언'}
                    </span>

                    {!item.isTeacher && (
                      item.favoriteRewarded ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {confirmCancelFbId === item.id ? (
                            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-rose-950/80 border border-rose-500/50 animate-in fade-in">
                              <span className="text-[11px] font-bold text-rose-300 pl-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                정말 취소할까요?
                              </span>
                              <button
                                type="button"
                                onClick={() => executeCancelReward(item.id, item.observerName)}
                                disabled={cancelRewardLoadingId === item.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                              >
                                {cancelRewardLoadingId === item.id ? (
                                  <>
                                    <RotateCcw className="w-3 h-3 animate-spin" />
                                    <span>취소 중...</span>
                                  </>
                                ) : (
                                  <span>네, 취소</span>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmCancelFbId(null)}
                                disabled={cancelRewardLoadingId === item.id}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
                              >
                                유지
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-400/10 px-2.5 py-1.5 rounded-xl border border-amber-400/30">
                                <Heart className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                보답 별(1개) 전달 완료
                              </span>
                              {onCancelRewardFeedback && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmCancelFbId(item.id)}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/70 px-2.5 py-1.5 rounded-xl border border-rose-500/40 hover:border-rose-400 transition-all cursor-pointer shadow-sm active:scale-95"
                                  title="친구에게 보낸 보답 별 취소"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                                  <span>보답 취소</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReward(item.id)}
                          disabled={isRewardDisabled}
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/10 disabled:opacity-50 cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                          {rewardLoadingId === item.id ? '전달 중...' : '마음에 들어요! 보답 별 1개 쏘기'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Rigorous AI Biomechanical Synthesis */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">AI 종합 피드백</h3>
                  <p className="text-[10px] text-slate-400">기준 기반 생체역학 정밀 분석</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAskAi}
                disabled={isAiLoading}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                  allStudentFeedbacksForShot.length === 0
                    ? 'text-slate-400 bg-slate-800 border border-slate-700 hover:bg-slate-750'
                    : 'text-slate-950 bg-amber-400 hover:bg-amber-300'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
                {isAiLoading ? '분석 중...' : existingAiEval ? '재분석 요청' : '종합 분석 요청'}
              </button>
            </div>

            {/* AI Notice / Error Messages */}
            {aiNoticeMsg && (
              <div className="p-3 mb-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{aiNoticeMsg}</span>
                </div>
                <button type="button" onClick={() => setAiNoticeMsg('')} className="text-emerald-400 hover:text-white px-1">✕</button>
              </div>
            )}
            {aiErrorMsg && (
              <div className="p-3 mb-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-semibold">{aiErrorMsg}</span>
                </div>
                <button type="button" onClick={() => setAiErrorMsg('')} className="text-rose-400 hover:text-white px-1">✕</button>
              </div>
            )}

            {/* Crucial Requirement Notice */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 mb-4 leading-relaxed">
              <strong className="text-amber-300">코치 지침:</strong> 무조건 칭찬만 하지 않고, 공식 4대 기준에 따라 아쉬운 부분과 잘한 부분을 엄격하고 객관적으로 지적합니다.
            </div>

            {/* AI Evaluation Display or Empty State */}
            {isAiLoading ? (
              <div className="py-12 text-center">
                <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-semibold text-amber-300">
                  동료들의 관찰 피드백을 생체역학 공식 기준으로 종합 분석하고 있습니다...
                </p>
                <p className="text-[11px] text-slate-500 mt-1">잠시만 기다려주세요.</p>
              </div>
            ) : existingAiEval ? (
              <div className="space-y-4">
                {/* Overall Grade Banner */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  existingAiEval.overallGrade === '우수'
                    ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-300'
                    : existingAiEval.overallGrade === '보통'
                    ? 'bg-amber-950/40 border-amber-800/70 text-amber-300'
                    : 'bg-rose-950/40 border-rose-800/70 text-rose-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    <span className="text-xs font-bold">자세 종합 평가:</span>
                  </div>
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-slate-950/80 border border-current">
                    {existingAiEval.overallGrade}
                  </span>
                </div>

                {/* Honest Summary */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                  <p className="font-semibold text-slate-100 mb-1">총평</p>
                  {existingAiEval.summary}
                </div>

                {/* 4 Criteria Matrix */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-300">공식 4대 평가기준 판정 결과</p>
                  <div className="space-y-1.5">
                    {existingAiEval.criteriaAnalysis?.map((item) => {
                      const isGood = item.status === '잘함';
                      const isBad = item.status === '보완필요';
                      return (
                        <div
                          key={item.criterionId}
                          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-200">
                              기준 {item.criterionId}: {item.criterionTitle}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              isGood
                                ? 'bg-emerald-900/60 text-emerald-300'
                                : isBad
                                ? 'bg-rose-900/60 text-rose-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {item.detail}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Strengths & Weaknesses Split */}
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/50">
                    <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 잘하고 있는 점
                    </p>
                    <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                      {existingAiEval.strengths?.map((str, i) => (
                        <li key={i}>{str}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/50">
                    <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5 mb-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> 반드시 보완해야 할 아쉬운 점
                    </p>
                    <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                      {existingAiEval.weaknesses?.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Drill Tip */}
                {existingAiEval.actionTips && existingAiEval.actionTips.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/50 text-xs text-slate-300">
                    <p className="font-bold text-amber-300 flex items-center gap-1.5 mb-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400" /> 다음 연습 원포인트 교정 드릴
                    </p>
                    <ul className="space-y-1 list-disc list-inside">
                      {existingAiEval.actionTips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <Bot className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-300 mb-1">
                  아직 AI 종합 분석이 진행되지 않았습니다.
                </p>
                <p className="text-[11px] text-slate-500 mb-4">
                  상단의 [종합 분석 요청] 버튼을 누르면 친구들의 피드백을 엄격하게 종합하여 맞춤 코칭을 제공합니다.
                </p>
                <button
                  type="button"
                  onClick={handleAskAi}
                  disabled={isAiLoading}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                    studentFeedbacks.length === 0
                      ? 'text-slate-400 bg-slate-800 border border-slate-700 hover:bg-slate-750'
                      : 'text-slate-950 bg-amber-400 hover:bg-amber-300'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isAiLoading ? 'AI 종합 분석 중...' : '지금 종합 피드백 요청하기'}
                </button>
                {studentFeedbacks.length === 0 && (
                  <p className="text-[11px] text-amber-400/90 mt-2 font-medium">
                    ※ 동료 또는 교사의 관찰 피드백이 1건 이상 등록되어야 종합 분석을 시작할 수 있습니다.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CleanBot Warning Modal */}
      <CleanBotWarningModal
        isOpen={!!cleanBotResult}
        cleanResult={cleanBotResult}
        onClose={() => setCleanBotResult(null)}
      />
    </div>
  );
};
