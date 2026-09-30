import React, { useState, useMemo, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Classroom,
  Student,
  FeedbackItem,
  AiEvaluation,
  ShotType,
  CriterionAssessment,
  MIDDLE_SHOT_CRITERIA,
  LAYUP_SHOT_CRITERIA,
  TeacherQuestion,
  StudentAnswer
} from '../types';
import { getDefaultSessionQuestions } from '../lib/defaultData';
import {
  Shield,
  KeyRound,
  FileSpreadsheet,
  Award,
  PlusCircle,
  RefreshCw,
  Send,
  Star,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Download,
  Users,
  UserPlus,
  Search,
  Lock,
  LogOut,
  ChevronRight,
  Edit3,
  Check,
  X,
  Sparkles,
  Layers,
  GraduationCap,
  Upload,
  Database,
  Save,
  MessageSquareQuote,
  HelpCircle,
  CheckCheck,
  AlertTriangle,
  Target,
  Calendar,
  Clock,
  Heart,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';

interface Props {
  classes: Classroom[];
  students: Student[];
  feedbacks: FeedbackItem[];
  activeSessions?: Record<string, number>;
  teacherQuestions?: Record<string, TeacherQuestion>;
  sessionQuestions?: Record<number, string>;
  classSessionQuestions?: Record<string, Record<number, string>>;
  studentAnswers?: Record<string, StudentAnswer>;
  onAddClass: (name: string) => Promise<boolean>;
  onUpdateClass: (id: string, name: string) => Promise<boolean>;
  onDeleteClass: (id: string) => Promise<boolean>;
  onBatchCreateGrade3?: (mode?: 'append' | 'reset-classes') => Promise<boolean>;
  onBulkUploadStudents: (classId: string, rawText: string, mode: 'replace' | 'append') => Promise<boolean>;
  onBulkUploadAllClasses?: (rawText: string, mode: 'replace-all' | 'append') => Promise<{ success: boolean; count?: number; message?: string }>;
  onImportState?: (data: { classes: Classroom[]; students: Student[]; feedbacks?: FeedbackItem[] }) => Promise<boolean>;
  onAddStudent?: (classId: string, number: number, name: string) => Promise<boolean>;
  onDeleteStudent?: (id: string) => Promise<boolean>;
  onDeleteFeedback?: (id: string) => Promise<boolean>;
  onClearFeedbacks?: (options?: {
    classId?: string;
    shotType?: ShotType | 'all';
    studentId?: string;
    session?: number | 'all';
    clearAiEvaluations?: boolean;
  } | string) => Promise<{ success: boolean; message?: string; deletedCount?: number } | boolean>;
  onSaveTeacherQuestion?: (classId: string, question: string, session?: number) => Promise<boolean>;
  onSaveSessionQuestion?: (session: number, question: string) => Promise<boolean>;
  onBatchSaveSessionQuestions?: (questions: Record<number, string>) => Promise<boolean>;
  onSaveClassSessionQuestion?: (classId: string, session: number, question: string) => Promise<boolean>;
  onBatchSaveClassSessionQuestions?: (classId: string, questions: Record<number, string>) => Promise<boolean>;
  onSubmitTeacherFeedback: (payload: {
    classId: string;
    performerId: string;
    performerName: string;
    shotType: ShotType;
    stars: number;
    criteriaResults: Record<number, CriterionAssessment>;
    comment: string;
    session?: number;
  }) => Promise<boolean>;
  onSetActiveSession?: (classId: string, session: number) => Promise<boolean>;
  onBatchSetActiveSession?: (session: number, classIds?: string[]) => Promise<boolean>;
  onResetData: () => Promise<boolean>;
}

// 1~17차시 수업 목록 상수
const SESSIONS_1_TO_17 = Array.from({ length: 17 }, (_, i) => i + 1);

// 1~17차시 농구 슛 교육과정 차시별 테마 정보
const SESSION_CURRICULUM: Record<number, { title: string; subtitle: string; icon: string }> = {
  1: { title: '1차시: 기본 감각 & 볼 핸들링', subtitle: '손가락 터치, 핑거팁 컨트롤, 공과 친숙해지기', icon: '🏀' },
  2: { title: '2차시: 미들슛 하체 반동 (Dip)', subtitle: '무릎 굽힘과 하체 에너지 전달, 비거리 확보', icon: '🦵' },
  3: { title: '3차시: 타점 (Set Point)과 시선', subtitle: '이마 위 타점 형성, 림 앞쪽 조준선 유지', icon: '👀' },
  4: { title: '4차시: 릴리스 & 팔로우 스로우', subtitle: '팔 뻗기(스완 넥), 일정한 릴리스 포물선', icon: '🏹' },
  5: { title: '5차시: 손목 스냅 & 백스핀', subtitle: '부드러운 손목 꺾임(Goose Neck), 역회전 유도', icon: '💫' },
  6: { title: '6차시: 미들슛 4대 기준 종합', subtitle: '타점-반동-팔로우-스냅 완벽한 체인 연결', icon: '⭐' },
  7: { title: '7차시: 레이업슛 1-2 리듬 스텝', subtitle: '원-투 리듬감 있는 발놀림, 감속 없는 전진', icon: '👟' },
  8: { title: '8차시: 백보드 사각형 조준 & 타점', subtitle: '백보드 상단 모서리 타점 키스, 각도 계산', icon: '🎯' },
  9: { title: '9차시: 수직 무릎 도약 & 체공력', subtitle: '안쪽 무릎 수직 차올리기, 높은 릴리스 위치', icon: '🚀' },
  10: { title: '10차시: 스텝-점프 유기적 연결', subtitle: '드리블-캐치-스텝-점프 원모션 부드러운 연결', icon: '🔗' },
  11: { title: '11차시: 골밑 돌파 & 착지 안정성', subtitle: '수비 접근 시 신체 밸런스 유지 및 안전한 양발 착지', icon: '🛡️' },
  12: { title: '12차시: 미들슛 vs 레이업 선택 판단', subtitle: '수비수 거리와 오픈 찬스 인지, 빠른 슛 선택', icon: '🧠' },
  13: { title: '13차시: 동료 상호 피드백 & 성찰', subtitle: '서로의 슛 폼 관찰하기, 건설적 별빛 조언 나누기', icon: '🤝' },
  14: { title: '14차시: 실전 슈팅 집중력 & 자세 일관성', subtitle: '체력 저하 상황에서도 동일한 슛 폼 유지하기', icon: '🔥' },
  15: { title: '15차시: 3:3 미니게임 실전 폼 적용', subtitle: '경기 속 움직임(무빙) 상황에서 침착한 슛 시도', icon: '⚔️' },
  16: { title: '16차시: 팀 패스 연계 슛 찬스 해결', subtitle: '공간 창출 후 패스 받아 즉각 슛으로 연결', icon: '⚡' },
  17: { title: '17차시: 1~17차시 총괄 슛 성장 평가', subtitle: '한 학기 나의 슛 자세 발전도 및 체육 태도 총결산', icon: '🏆' },
};

export const TeacherMode: React.FC<Props> = ({
  classes,
  students,
  feedbacks,
  activeSessions = {},
  teacherQuestions = {},
  sessionQuestions = {},
  classSessionQuestions = {},
  studentAnswers = {},
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onBatchCreateGrade3,
  onBulkUploadStudents,
  onBulkUploadAllClasses,
  onImportState,
  onAddStudent,
  onDeleteStudent,
  onDeleteFeedback,
  onClearFeedbacks,
  onSaveTeacherQuestion,
  onSaveSessionQuestion,
  onBatchSaveSessionQuestions,
  onSaveClassSessionQuestion,
  onBatchSaveClassSessionQuestions,
  onSubmitTeacherFeedback,
  onSetActiveSession,
  onBatchSetActiveSession,
  onResetData
}) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Active Tab: 'classes' | 'roster' | 'question' | 'feedback' | 'settings'
  const [activeTab, setActiveTab] = useState<'classes' | 'roster' | 'question' | 'feedback' | 'settings'>('classes');

  // Daily Question States (심플 학급 선택 -> 1~17차시 질문 목록 입력 -> 차시 변경 시 자동 연동)
  const [questionClassId, setQuestionClassId] = useState<string>(classes[0]?.id || '');
  const [classQuestionsInput, setClassQuestionsInput] = useState<Record<number, string>>({});
  const lastLoadedQuestionClassIdRef = useRef<string>('');
  const isQuestionDirtyRef = useRef<boolean>(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState<boolean>(false);
  const [savedSessionNum, setSavedSessionNum] = useState<number | 'all' | null>(null);
  const [sessionSuccessToast, setSessionSuccessToast] = useState<string>('');
  const [answersFilterSession, setAnswersFilterSession] = useState<number | 'all'>('all');

  // Keep questionClassId valid
  useEffect(() => {
    if (classes.length > 0 && !classes.some(c => c.id === questionClassId)) {
      setQuestionClassId(classes[0].id);
    }
  }, [classes, questionClassId]);

  // Load questions for the selected class without forcing default filler questions
  useEffect(() => {
    if (questionClassId !== lastLoadedQuestionClassIdRef.current) {
      lastLoadedQuestionClassIdRef.current = questionClassId;
      isQuestionDirtyRef.current = false;
      const classQ = (classSessionQuestions && classSessionQuestions[questionClassId]) || {};
      const newMap: Record<number, string> = {};
      SESSIONS_1_TO_17.forEach(n => {
        newMap[n] = classQ[n] || '';
      });
      // Fallback: if legacy teacherQuestions has a question for this class and session is empty
      if (teacherQuestions[questionClassId]?.question && !Object.values(classQ).some(Boolean)) {
        const activeSess = activeSessions[questionClassId] || 1;
        newMap[activeSess] = teacherQuestions[questionClassId].question;
      }
      setClassQuestionsInput(newMap);
    } else if (!isQuestionDirtyRef.current) {
      const classQ = (classSessionQuestions && classSessionQuestions[questionClassId]) || {};
      setClassQuestionsInput(prev => {
        const updated: Record<number, string> = { ...prev };
        SESSIONS_1_TO_17.forEach(n => {
          if (classQ[n] !== undefined) {
            updated[n] = classQ[n];
          }
        });
        return updated;
      });
    }
  }, [questionClassId, classSessionQuestions, teacherQuestions, activeSessions]);

  // Class Management States (반별 관리)
  const [newClassName, setNewClassName] = useState<string>('');
  const [showAddClassForm, setShowAddClassForm] = useState<boolean>(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState<string>('');
  const [isClassSubmitting, setIsClassSubmitting] = useState<boolean>(false);
  const [classActionMsg, setClassActionMsg] = useState<string>('');

  // Single Student add states
  const [singleStudentNum, setSingleStudentNum] = useState<string>('1');
  const [singleStudentName, setSingleStudentName] = useState<string>('');
  const [rosterInputType, setRosterInputType] = useState<'paste' | 'single'>('paste');

  // Feedback Tab States
  const [fbClassId, setFbClassId] = useState<string>(classes[0]?.id || '');
  const [fbStudentId, setFbStudentId] = useState<string>('');
  const [fbShotType, setFbShotType] = useState<ShotType>('middle');
  const [fbSession, setFbSession] = useState<number>(1);
  const [fbStars, setFbStars] = useState<number>(3);

  // Sync fbSession when fbClassId or activeSessions changes
  useEffect(() => {
    if (fbClassId && activeSessions[fbClassId]) {
      setFbSession(activeSessions[fbClassId]);
    }
  }, [fbClassId, activeSessions]);
  const [fbCriteria, setFbCriteria] = useState<Record<number, CriterionAssessment>>({
    1: 'good',
    2: 'good',
    3: 'good',
    4: 'good'
  });
  const [fbComment, setFbComment] = useState<string>('');
  const [isFbSubmitting, setIsFbSubmitting] = useState<boolean>(false);
  const [fbSuccessMsg, setFbSuccessMsg] = useState<string>('');
  const [fbErrorMsg, setFbErrorMsg] = useState<string>('');

  // Roster Tab States (Excel Paste single class)
  const [rosterClassId, setRosterClassId] = useState<string>(classes[0]?.id || '');
  const [rawExcelText, setRawExcelText] = useState<string>('');
  const [rosterMode, setRosterMode] = useState<'replace' | 'append'>('replace');
  const [isRosterSubmitting, setIsRosterSubmitting] = useState<boolean>(false);
  const [rosterSuccessMsg, setRosterSuccessMsg] = useState<string>('');

  // Local storage cached backup check
  const [cachedBackup, setCachedBackup] = useState<{
    classes: Classroom[];
    students: Student[];
    feedbacks?: FeedbackItem[];
    aiEvaluations?: Record<string, AiEvaluation>;
    savedAt: number;
  } | null>(null);

  useEffect(() => {
    try {
      const fullRaw = localStorage.getItem('shootingstar_full_backup');
      if (fullRaw) {
        const parsed = JSON.parse(fullRaw);
        if (parsed && Array.isArray(parsed.students) && parsed.students.length > 0) {
          setCachedBackup(parsed);
          return;
        }
      }
      const raw = localStorage.getItem('shootingstar_roster_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.students) && parsed.students.length > 0) {
          setCachedBackup(parsed);
        }
      }
    } catch (e) {
      // ignore
    }
  }, [students.length, feedbacks.length]);

  // Sync selected class ids when classes change
  useEffect(() => {
    if (classes.length > 0) {
      if (!classes.some(c => c.id === fbClassId)) {
        setFbClassId(classes[0].id);
      }
      if (!classes.some(c => c.id === rosterClassId)) {
        setRosterClassId(classes[0].id);
      }
      if (!classes.some(c => c.id === questionClassId)) {
        setQuestionClassId(classes[0].id);
      }
    }
  }, [classes, fbClassId, rosterClassId, questionClassId]);

  // Batch session dropdown state
  const [batchSessionSelect, setBatchSessionSelect] = useState<number | ''>('');
  const [isBatchApplying, setIsBatchApplying] = useState<boolean>(false);

  // Check if all classes currently share the same active session
  const commonActiveSession = useMemo(() => {
    if (classes.length === 0) return 1;
    const firstVal = activeSessions[classes[0].id] !== undefined ? activeSessions[classes[0].id] : 1;
    const allSame = classes.every(c => (activeSessions[c.id] !== undefined ? activeSessions[c.id] : 1) === firstVal);
    return allSame ? firstVal : '';
  }, [classes, activeSessions]);

  const handleBatchSetSession = async (targetSession: number) => {
    if (classes.length === 0) return;
    setIsBatchApplying(true);
    try {
      if (onBatchSetActiveSession) {
        await onBatchSetActiveSession(targetSession);
      } else if (onSetActiveSession) {
        await Promise.all(classes.map(c => onSetActiveSession(c.id, targetSession)));
      }
      const label = targetSession === 0 ? '전체 차시 보기 (통합)' : `${targetSession}차시`;
      setClassActionMsg(`모든 학급(${classes.length}개 반)의 수업 차시가 [${label}](으)로 일괄 지정되었습니다.`);
      setTimeout(() => setClassActionMsg(''), 3500);
    } catch {
      setClassActionMsg('차시 일괄 지정 중 오류가 발생했습니다.');
      setTimeout(() => setClassActionMsg(''), 3500);
    } finally {
      setIsBatchApplying(false);
    }
  };

  // Settings & Granular Reset states (정밀 데이터 초기화 권한 콘솔)
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [clearTargetClassId, setClearTargetClassId] = useState<string>('all');
  const [clearTargetShotType, setClearTargetShotType] = useState<ShotType | 'all'>('all');
  const [clearTargetStudentId, setClearTargetStudentId] = useState<string>('all');
  const [clearTargetSession, setClearTargetSession] = useState<number | 'all'>('all');
  const [clearIncludeAi, setClearIncludeAi] = useState<boolean>(true);
  const [confirmClearStep, setConfirmClearStep] = useState<boolean>(false);
  const [isClearingFeedbacks, setIsClearingFeedbacks] = useState<boolean>(false);
  const [clearResultToast, setClearResultToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDeleteFbId, setConfirmDeleteFbId] = useState<string | null>(null);
  const [feedbackViewFilter, setFeedbackViewFilter] = useState<string>('all');

  // Filter students belonging to clearTargetClassId
  const clearTargetStudents = useMemo(() => {
    if (clearTargetClassId === 'all') return students;
    return students.filter(s => s.classId === clearTargetClassId);
  }, [students, clearTargetClassId]);

  // Feedbacks matching granular clear conditions (class, shot, student, session)
  const matchedClearFeedbacks = useMemo(() => {
    return feedbacks.filter(f => {
      if (clearTargetClassId !== 'all' && f.classId !== clearTargetClassId) return false;
      if (clearTargetShotType !== 'all' && f.shotType !== clearTargetShotType) return false;
      if (clearTargetStudentId !== 'all' && f.performerId !== clearTargetStudentId && f.observerId !== clearTargetStudentId) return false;
      if (clearTargetSession !== 'all' && (f.session || 1) !== clearTargetSession) return false;
      return true;
    });
  }, [feedbacks, clearTargetClassId, clearTargetShotType, clearTargetStudentId, clearTargetSession]);

  const matchedClearStars = useMemo(() => {
    return matchedClearFeedbacks.reduce((sum, f) => sum + (Number(f.stars) || 0) + (f.favoriteRewarded ? 1 : 0), 0);
  }, [matchedClearFeedbacks]);

  const matchedClearRewardedStars = useMemo(() => {
    return matchedClearFeedbacks.filter(f => f.favoriteRewarded).length;
  }, [matchedClearFeedbacks]);

  const matchedClearUniqueStudents = useMemo(() => {
    const sIds = new Set<string>();
    matchedClearFeedbacks.forEach(f => {
      if (f.performerId) sIds.add(f.performerId);
      if (f.observerId) sIds.add(f.observerId);
    });
    return sIds.size;
  }, [matchedClearFeedbacks]);

  // Filter students for feedback tab
  const fbStudents = students.filter(s => s.classId === fbClassId);
  const targetStudent = students.find(s => s.id === fbStudentId);

  // Automatically select the first student when switching class or when no student is selected
  useEffect(() => {
    if (fbStudents.length > 0 && (!fbStudentId || !fbStudents.some(s => s.id === fbStudentId))) {
      setFbStudentId(fbStudents[0].id);
    }
  }, [fbClassId, fbStudents, fbStudentId]);

  // Filter students for roster tab
  const currentRosterClass = classes.find(c => c.id === rosterClassId);
  const currentClassStudents = students.filter(s => s.classId === rosterClassId);

  const currentCriteria = fbShotType === 'middle' ? MIDDLE_SHOT_CRITERIA : LAYUP_SHOT_CRITERIA;

  // Real-time parsing preview for Excel raw text
  const parsedPreview = useMemo(() => {
    if (!rawExcelText.trim()) return [];
    const lines = rawExcelText.split('\n').map(l => l.trim()).filter(Boolean);
    const result: { num: number; name: string }[] = [];
    let autoNum = 1;

    for (const line of lines) {
      const tabParts = line.split(/[\t,]+/).map(s => s.trim()).filter(Boolean);
      if (tabParts.length >= 2) {
        const pNum = parseInt(tabParts[0], 10);
        if (!isNaN(pNum)) {
          result.push({ num: pNum, name: tabParts[1] });
          autoNum = Math.max(autoNum, pNum) + 1;
        } else {
          result.push({ num: autoNum++, name: tabParts.join(' ') });
        }
      } else {
        const spaceParts = line.split(/\s+/);
        if (spaceParts.length >= 2 && !isNaN(parseInt(spaceParts[0], 10))) {
          result.push({ num: parseInt(spaceParts[0], 10), name: spaceParts.slice(1).join(' ') });
          autoNum = Math.max(autoNum, parseInt(spaceParts[0], 10)) + 1;
        } else {
          result.push({ num: autoNum++, name: line });
        }
      }
    }
    return result;
  }, [rawExcelText]);

  // Download JSON backup
  const handleDownloadBackup = () => {
    const backupData = {
      classes,
      students,
      feedbacks,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shooting_star_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Upload and Restore JSON backup
  const handleFileUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && Array.isArray(json.classes) && Array.isArray(json.students)) {
          const feedbackCount = Array.isArray(json.feedbacks) ? json.feedbacks.length : 0;
          if (confirm(`백업 파일에서 학급 ${json.classes.length}개, 학생 ${json.students.length}명, 피드백 ${feedbackCount}건을 복원하시겠습니까?`)) {
            if (onImportState) {
              const ok = await onImportState(json);
              if (ok) {
                alert(`성공적으로 복원되었습니다! (학급 ${json.classes.length}개, 학생 ${json.students.length}명, 피드백 ${feedbackCount}건)`);
              }
            }
          }
        } else {
          alert('올바른 백업 JSON 형식이 아닙니다.');
        }
      } catch (err: any) {
        alert('백업 파일 읽기 오류: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '0221') {
      setIsAuthenticated(true);
      setPinError('');
    } else {
      setPinError('비밀번호가 올바르지 않습니다.');
    }
  };

  // Submit Teacher Feedback
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFbErrorMsg('');
    setFbSuccessMsg('');

    if (!targetStudent) {
      if (fbStudents.length === 0) {
        setFbErrorMsg('선택하신 학급에 등록된 학생이 없습니다. [명렬표 관리] 탭에서 학생 명단을 먼저 등록해주세요.');
      } else {
        setFbErrorMsg('지도할 대상 학생을 먼저 선택해주세요. (2번 항목)');
      }
      return;
    }

    setIsFbSubmitting(true);
    try {
      const ok = await onSubmitTeacherFeedback({
        classId: fbClassId,
        performerId: targetStudent.id,
        performerName: targetStudent.name,
        shotType: fbShotType,
        stars: fbStars,
        criteriaResults: fbCriteria,
        comment: fbComment.trim(),
        session: fbSession
      });

      if (ok) {
        setFbSuccessMsg(`${targetStudent.name} 학생에게 교사 지도 피드백과 별점(${fbStars}개)이 성공적으로 등록되었습니다.`);
        setFbComment('');
        setTimeout(() => setFbSuccessMsg(''), 5000);
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#f43f5e', '#fb7185', '#f59e0b']
        });
      } else {
        setFbErrorMsg('교사 피드백 등록 처리에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (err: any) {
      setFbErrorMsg('등록 중 오류 발생: ' + (err.message || '네트워크 오류'));
    } finally {
      setIsFbSubmitting(false);
    }
  };

  // Submit Excel Bulk Roster
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedPreview.length === 0) return;
    setIsRosterSubmitting(true);
    try {
      const ok = await onBulkUploadStudents(rosterClassId, rawExcelText, rosterMode);
      if (ok) {
        setRosterSuccessMsg(`${parsedPreview.length}명의 학생 명단이 성공적으로 등록되었습니다.`);
        setRawExcelText('');
        setTimeout(() => setRosterSuccessMsg(''), 4000);
      }
    } finally {
      setIsRosterSubmitting(false);
    }
  };

  // Direct class registration by name (e.g. "3학년 1반")
  const handleRegisterDirectClass = async (className: string) => {
    if (classes.some(c => c.name === className)) {
      setClassActionMsg(`'${className}'은(는) 이미 등록되어 있습니다.`);
      setTimeout(() => setClassActionMsg(''), 3000);
      return;
    }
    setIsClassSubmitting(true);
    try {
      const ok = await onAddClass(className);
      if (ok) {
        setClassActionMsg(`'${className}' 학급이 등록되었습니다.`);
        setTimeout(() => setClassActionMsg(''), 3500);
      }
    } finally {
      setIsClassSubmitting(false);
    }
  };

  // Add new class via form
  const handleAddNewClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetName = newClassName.trim();
    if (!targetName) return;

    if (classes.some(c => c.name === targetName)) {
      setClassActionMsg(`'${targetName}'은(는) 이미 등록되어 있습니다.`);
      setTimeout(() => setClassActionMsg(''), 3000);
      return;
    }

    setIsClassSubmitting(true);
    try {
      const ok = await onAddClass(targetName);
      if (ok) {
        setClassActionMsg(`'${targetName}' 학급이 등록되었습니다.`);
        setNewClassName('');
        setShowAddClassForm(false);
        setTimeout(() => setClassActionMsg(''), 3500);
      }
    } finally {
      setIsClassSubmitting(false);
    }
  };

  // Add single student to current rosterClassId
  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleStudentName.trim() || !rosterClassId || !onAddStudent) return;
    setIsRosterSubmitting(true);
    try {
      const num = parseInt(singleStudentNum, 10) || 1;
      const ok = await onAddStudent(rosterClassId, num, singleStudentName.trim());
      if (ok) {
        setRosterSuccessMsg(`${num}번 ${singleStudentName.trim()} 학생이 등록되었습니다.`);
        setSingleStudentName('');
        setSingleStudentNum(String(num + 1));
        setTimeout(() => setRosterSuccessMsg(''), 3500);
      }
    } finally {
      setIsRosterSubmitting(false);
    }
  };

  // Delete single student
  const handleDeleteSingleStudent = async (studentId: string, studentName: string) => {
    if (!onDeleteStudent) return;
    if (!confirm(`'${studentName}' 학생을 삭제하시겠습니까?`)) return;
    const ok = await onDeleteStudent(studentId);
    if (ok) {
      setRosterSuccessMsg(`'${studentName}' 학생이 명단에서 삭제되었습니다.`);
      setTimeout(() => setRosterSuccessMsg(''), 3000);
    }
  };

  // Start editing class name
  const handleStartEditClass = (c: Classroom) => {
    setEditingClassId(c.id);
    setEditingClassName(c.name);
  };

  // Save edited class name
  const handleSaveEditClass = async (id: string) => {
    if (!editingClassName.trim()) return;
    setIsClassSubmitting(true);
    try {
      const ok = await onUpdateClass(id, editingClassName.trim());
      if (ok) {
        setClassActionMsg(`학급 명칭이 '${editingClassName.trim()}'(으)로 수정되었습니다.`);
        setEditingClassId(null);
        setEditingClassName('');
        setTimeout(() => setClassActionMsg(''), 3500);
      }
    } finally {
      setIsClassSubmitting(false);
    }
  };

  // Delete class with confirmation
  const handleDeleteClassPrompt = async (c: Classroom) => {
    const studentCount = students.filter(s => s.classId === c.id).length;
    const feedbackCount = feedbacks.filter(f => f.classId === c.id).length;
    let confirmMsg = `정말 '${c.name}' 학급을 삭제하시겠습니까?`;
    if (studentCount > 0 || feedbackCount > 0) {
      confirmMsg += `\n\n[주의] 이 학급에 속한 학생 명단(${studentCount}명)과 피드백(${feedbackCount}건) 데이터도 함께 영구 삭제됩니다.`;
    }

    if (!confirm(confirmMsg)) return;

    setIsClassSubmitting(true);
    try {
      const ok = await onDeleteClass(c.id);
      if (ok) {
        setClassActionMsg(`'${c.name}' 학급이 삭제되었습니다.`);
        if (fbClassId === c.id) {
          setFbClassId(classes.find(item => item.id !== c.id)?.id || '');
        }
        if (rosterClassId === c.id) {
          setRosterClassId(classes.find(item => item.id !== c.id)?.id || '');
        }
        setTimeout(() => setClassActionMsg(''), 3500);
      }
    } finally {
      setIsClassSubmitting(false);
    }
  };

  // Batch register 3학년 1~11반
  const handleBatchRegisterGrade3 = async (mode: 'append' | 'reset-classes') => {
    if (!onBatchCreateGrade3) return;
    const confirmMsg = mode === 'reset-classes'
      ? '3학년 1반부터 11반까지 11개 학급 목록으로 전체 재정렬합니다.\n(기존 다른 학급은 삭제됩니다)\n계속 진행하시겠습니까?'
      : '3학년 1반부터 11반까지 11개 학급을 자동으로 등록합니다.\n(이미 등록된 반은 유지됩니다)\n계속 진행하시겠습니까?';

    if (!confirm(confirmMsg)) return;

    setIsClassSubmitting(true);
    try {
      const ok = await onBatchCreateGrade3(mode);
      if (ok) {
        setClassActionMsg('3학년 1~11반 학급 목록이 성공적으로 등록되었습니다!');
        setTimeout(() => setClassActionMsg(''), 4000);
      }
    } finally {
      setIsClassSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['일시', '학급', '수행자', '관찰자(교사여부)', '슛유형', '별개수', '코멘트'];
    const rows = feedbacks.map(f => {
      const cObj = classes.find(c => c.id === f.classId);
      return [
        new Date(f.timestamp).toLocaleString(),
        cObj ? cObj.name : f.classId,
        f.performerName,
        f.isTeacher ? '체육교사' : f.observerName,
        f.shotType === 'middle' ? '미들슛' : '레이업슛',
        f.stars,
        `"${(f.comment || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `농구슛_피드백_현황_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Feedback deletion & granular clear handlers
  const handleClearFeedbacksAction = async () => {
    if (!onClearFeedbacks) return;
    if (matchedClearFeedbacks.length === 0) return;

    setIsClearingFeedbacks(true);
    setConfirmClearStep(false);

    try {
      const result = await onClearFeedbacks({
        classId: clearTargetClassId,
        shotType: clearTargetShotType,
        studentId: clearTargetStudentId,
        session: clearTargetSession,
        clearAiEvaluations: clearIncludeAi
      });

      const isSuccess = typeof result === 'boolean' ? result : result.success;
      const msg = typeof result === 'object' && result.message
        ? result.message
        : '피드백 및 별점 데이터가 성공적으로 초기화되었습니다.';

      if (isSuccess) {
        setClearResultToast({ type: 'success', text: msg });
        setTimeout(() => setClearResultToast(null), 6000);
      } else {
        setClearResultToast({ type: 'error', text: msg || '초기화 처리에 실패했습니다.' });
        setTimeout(() => setClearResultToast(null), 6000);
      }
    } catch (err: any) {
      setClearResultToast({ type: 'error', text: err.message || '오류가 발생했습니다.' });
      setTimeout(() => setClearResultToast(null), 6000);
    } finally {
      setIsClearingFeedbacks(false);
    }
  };

  const handleDeleteFeedbackAction = async (id: string) => {
    if (!onDeleteFeedback) return;
    setIsClearingFeedbacks(true);
    try {
      const success = await onDeleteFeedback(id);
      if (success) {
        setConfirmDeleteFbId(null);
        setClearResultToast({ type: 'success', text: '선택한 피드백이 삭제되었습니다.' });
        setTimeout(() => setClearResultToast(null), 4000);
      }
    } finally {
      setIsClearingFeedbacks(false);
    }
  };

  // Save single session question for the selected class
  const handleSaveSingleSessionAction = async (sessionNum: number) => {
    if (!questionClassId) return;
    setIsSavingQuestion(true);
    setSavedSessionNum(sessionNum);
    const qText = (classQuestionsInput[sessionNum] || '').trim();
    if (onSaveClassSessionQuestion) {
      await onSaveClassSessionQuestion(questionClassId, sessionNum, qText);
    }
    // Also sync to legacy teacherQuestions if this session is the active one
    const currentActive = activeSessions[questionClassId] || 1;
    if (sessionNum === currentActive && onSaveTeacherQuestion) {
      await onSaveTeacherQuestion(questionClassId, qText, sessionNum);
    }
    isQuestionDirtyRef.current = false;
    setIsSavingQuestion(false);
    const cName = classes.find(c => c.id === questionClassId)?.name || '선택 학급';
    setSessionSuccessToast(
      qText
        ? `${cName} ${sessionNum}차시 저장 완료`
        : `${cName} ${sessionNum}차시 초기화 완료`
    );
    setTimeout(() => {
      setSessionSuccessToast('');
      setSavedSessionNum(null);
    }, 2000);
  };

  // Batch save all 1~17 session questions for the selected class
  const handleBatchSaveAllSessionsAction = async () => {
    if (!questionClassId) return;
    setIsSavingQuestion(true);
    setSavedSessionNum('all');
    if (onBatchSaveClassSessionQuestions) {
      await onBatchSaveClassSessionQuestions(questionClassId, classQuestionsInput);
    }
    const currentActive = activeSessions[questionClassId] || 1;
    if (onSaveTeacherQuestion) {
      await onSaveTeacherQuestion(questionClassId, (classQuestionsInput[currentActive] || '').trim(), currentActive);
    }
    isQuestionDirtyRef.current = false;
    setIsSavingQuestion(false);
    const cName = classes.find(c => c.id === questionClassId)?.name || '선택 학급';
    setSessionSuccessToast(`${cName} 1~17차시 전체 저장 완료`);
    setTimeout(() => {
      setSessionSuccessToast('');
      setSavedSessionNum(null);
    }, 2000);
  };

  // Change class active session (automatically reflects that session's question in PerformerMode)
  const handleClassSessionSelectAction = async (classId: string, sessionNum: number) => {
    if (!onSetActiveSession) return;
    await onSetActiveSession(classId, sessionNum);
    const cName = classes.find(c => c.id === classId)?.name || '선택 학급';
    setSessionSuccessToast(`${cName} ${sessionNum}차시로 변경 완료`);
    setTimeout(() => setSessionSuccessToast(''), 2000);
  };

  // 1. PIN Auth Screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center relative z-10">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-400/40 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-400/10 text-rose-300 border border-rose-400/20 text-xs font-bold mb-3">
          교사 모드
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-2">
          별빛 관제센터 로그인
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          체육 교사 전용 관리자 암호를 입력해주세요.
        </p>

        <form onSubmit={handleLogin} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl text-left">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              교사 인증 비밀번호
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="비밀번호 입력"
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-400"
              />
            </div>
            {pinError && (
              <p className="text-xs text-rose-400 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {pinError}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm transition-all shadow-lg shadow-rose-500/20"
          >
            관제센터 입장하기
          </button>
        </form>
      </div>
    );
  }

  // 2. Teacher Authenticated Dashboard
  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-8 relative z-10 overflow-x-hidden">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-400/10 text-rose-300 border border-rose-400/20 text-xs font-bold mb-1.5">
            <Shield className="w-3.5 h-3.5 text-rose-400" />
            교사 모드
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            별빛 관제센터 (체육 교사용)
          </h2>
          <p className="text-xs text-slate-400">
            학생 슛 피드백 및 별(1~3개) 부여, 학급별 엑셀 명렬표 등록을 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm" title="학생들의 피드백 및 답변 작성 시 욕설과 성적 표현을 100% 자동 차단합니다.">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">클린봇(CleanBot) 안전 가동 중</span>
            <span className="sm:hidden">클린봇 작동</span>
          </div>

          <button
            type="button"
            onClick={() => setIsAuthenticated(false)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800"
          >
            <LogOut className="w-3.5 h-3.5" /> 교사 로그아웃
          </button>
        </div>
      </div>

      {/* Action alert toast */}
      {classActionMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-medium">{classActionMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setClassActionMsg('')}
            className="p-1 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-900/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cached Backup Recovery Alert */}
      {cachedBackup && (cachedBackup.students.length > students.length || (cachedBackup.feedbacks && cachedBackup.feedbacks.length > feedbacks.length)) && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                <span>이전 등록된 명렬표 및 피드백 데이터가 브라우저에 안전하게 보관되어 있습니다!</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px]">
                  {cachedBackup.classes.length}개 반 &bull; 총 {cachedBackup.students.length}명
                  {cachedBackup.feedbacks && cachedBackup.feedbacks.length > 0 && ` &bull; 피드백 ${cachedBackup.feedbacks.length}건`}
                </span>
              </p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                서버 재시작 이전 작성하셨던 1~11반 학생 명단 및 주고받은 피드백&별을 단 한 번의 클릭으로 즉시 복원할 수 있습니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (onImportState) {
                const ok = await onImportState({
                  classes: cachedBackup.classes,
                  students: cachedBackup.students,
                  feedbacks: cachedBackup.feedbacks
                });
                if (ok) {
                  alert(`${cachedBackup.students.length}명의 명렬표와 ${cachedBackup.feedbacks?.length || 0}건의 피드백이 완벽하게 복원되었습니다!`);
                }
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shrink-0 cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5 self-start sm:self-center"
          >
            <Sparkles className="w-3.5 h-3.5" />
            보관된 데이터 즉시 복원하기
          </button>
        </div>
      )}

      {/* Responsive Grid Tabs: 2 cols on mobile, 5 cols on desktop */}
      <div className="grid grid-cols-2 sm:flex sm:flex-nowrap bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 mb-6 w-full max-w-3xl gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`py-2.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'classes'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>학급 관리</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`py-2.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'roster'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
          <span>학생 명렬표</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('question')}
          className={`py-2.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'question'
              ? 'bg-amber-400 text-slate-950 font-extrabold shadow-md shadow-amber-400/20'
              : 'text-amber-300/80 hover:text-amber-200 hover:bg-amber-400/10'
          }`}
        >
          <MessageSquareQuote className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>오늘의 질문</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('feedback')}
          className={`py-2.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'feedback'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Award className="w-3.5 h-3.5 shrink-0" />
          <span>교사 피드백&별</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`col-span-2 sm:col-span-1 py-2.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'settings'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span>데이터 관리·초기화</span>
        </button>
      </div>

      {/* TAB 0: Class Management (학급 목록 및 관리) */}
      {activeTab === 'classes' && (
        <div className="space-y-6">
          {/* Registered Classes Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-rose-400" />
                  현재 등록된 학급 목록
                  <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                    총 {classes.length}개 반
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  등록된 학급 이름을 클릭하여 수정하거나 필요 시 삭제할 수 있습니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddClassForm(prev => !prev)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
              >
                <PlusCircle className="w-4 h-4 text-amber-400" />
                {showAddClassForm ? '추가창 닫기' : '+ 새 학급 추가'}
              </button>
            </div>

            {/* Inline Add Class Form (Toggled) */}
            {showAddClassForm && (
              <form onSubmit={handleAddNewClass} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center gap-2.5 animate-fadeIn">
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="추가할 학급명 입력 (예: 3학년 12반, 체육특기반 등)"
                  autoFocus
                  className="w-full sm:flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={isClassSubmitting || !newClassName.trim()}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <PlusCircle className="w-4 h-4" />
                    등록하기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddClassForm(false);
                      setNewClassName('');
                    }}
                    className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-bold transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                </div>
              </form>
            )}

            {classes.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-dashed border-slate-800">
                <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-300 font-bold text-sm mb-1">등록된 학급이 없습니다.</p>
                <p className="text-slate-500 text-xs mb-4">상단의 반별 등록 버튼을 눌러 필요한 학급을 하나씩 등록해보세요.</p>
                <button
                  type="button"
                  onClick={() => handleRegisterDirectClass('3학년 1반')}
                  className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-400 cursor-pointer"
                >
                  3학년 1반 등록하기
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Batch Session Control for all classes (드롭다운으로 일괄 지정) */}
                {classes.length > 0 && (onSetActiveSession || onBatchSetActiveSession) && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-950/20 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3.5 text-xs shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center font-bold shrink-0 shadow-inner">
                        <Calendar className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-xs sm:text-sm">
                            전체 학급 수업 차시 일괄 지정
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                            1~17차시 지원
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          드롭다운으로 원하는 차시를 선택하여 등록된 모든 학급({classes.length}개 반)에 즉시 일괄 적용할 수 있습니다.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <div className="relative min-w-[210px] flex-1 sm:flex-initial">
                        <select
                          value={batchSessionSelect !== '' ? batchSessionSelect : commonActiveSession}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            setBatchSessionSelect(val);
                            if (val !== '') {
                              handleBatchSetSession(val);
                            }
                          }}
                          disabled={isBatchApplying}
                          className="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-slate-950 border border-amber-500/50 hover:border-amber-400 text-amber-300 font-extrabold text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/30 cursor-pointer shadow-md transition-all disabled:opacity-50"
                        >
                          <option value="" disabled>
                            -- 일괄 지정할 차시 선택 --
                          </option>
                          <option value={0}>전체 차시 통합 보기 (누적 피드백)</option>
                          {SESSIONS_1_TO_17.map(sess => (
                            <option key={sess} value={sess}>
                              {sess}차시로 일괄 지정
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        disabled={isBatchApplying}
                        onClick={() => {
                          const target = batchSessionSelect !== ''
                            ? Number(batchSessionSelect)
                            : (commonActiveSession !== '' ? Number(commonActiveSession) : 1);
                          handleBatchSetSession(target);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs transition-all shadow-md hover:shadow-amber-400/20 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        {isBatchApplying ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            적용 중...
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            일괄 적용
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {classes.map((c) => {
                  const studentCount = students.filter(s => s.classId === c.id).length;
                  const feedbackCount = feedbacks.filter(f => f.classId === c.id).length;
                  const isEditing = editingClassId === c.id;

                  return (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-md"
                    >
                      <div>
                        {/* Card Header: Edit or View */}
                        {isEditing ? (
                          <div className="flex items-center gap-2 mb-3">
                            <input
                              type="text"
                              value={editingClassName}
                              onChange={(e) => setEditingClassName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveEditClass(c.id);
                                } else if (e.key === 'Escape') {
                                  setEditingClassId(null);
                                }
                              }}
                              autoFocus
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-rose-500 text-sm text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditClass(c.id)}
                              className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-400"
                              title="저장"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingClassId(null)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                              title="취소"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                                {c.name.match(/\d+반/) ? c.name.match(/\d+반/)?.[0] : c.name.slice(0, 3)}
                              </span>
                              <h4 className="font-extrabold text-white text-base leading-tight">
                                {c.name}
                              </h4>
                            </div>

                            {/* Edit / Delete action buttons */}
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditClass(c)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                                title="학급 명칭 수정"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClassPrompt(c)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                                title="학급 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Counts & Status */}
                        <div className="flex items-center gap-2 text-xs mb-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium ${
                            studentCount > 0
                              ? 'bg-sky-950/40 text-sky-300 border-sky-800/60'
                              : 'bg-slate-950 text-slate-500 border-slate-800'
                          }`}>
                            <Users className="w-3.5 h-3.5" />
                            학생 {studentCount}명
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium ${
                            feedbackCount > 0
                              ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                              : 'bg-slate-950 text-slate-500 border-slate-800'
                          }`}>
                            <Award className="w-3.5 h-3.5" />
                            피드백 {feedbackCount}건
                            {feedbackCount > 0 && onClearFeedbacks && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setClearTargetClassId(c.id);
                                  setClearTargetShotType('all');
                                  setActiveTab('settings');
                                }}
                                className="ml-1 text-amber-400 hover:text-rose-400 p-0.5 rounded transition-colors"
                                title={`${c.name} 피드백 및 별점 초기화 설정`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        </div>

                        {/* Active Session Selector */}
                        <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/80 mb-3 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300 font-bold flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-amber-400" />
                              수행자 연동 차시:
                            </span>
                            <div className="flex items-center gap-1">
                              <select
                                value={activeSessions[c.id] !== undefined ? activeSessions[c.id] : 1}
                                onChange={(e) => onSetActiveSession?.(c.id, Number(e.target.value))}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-300 font-extrabold text-xs focus:outline-none focus:border-amber-400 cursor-pointer shadow-sm"
                              >
                                <option value={0}>전체 차시 보기</option>
                                {SESSIONS_1_TO_17.map(n => (
                                  <option key={n} value={n}>{n}차시</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            * 학생 수행자 모드에 이 차시의 피드백이 고정 표시됩니다.
                          </p>
                        </div>
                      </div>

                      {/* Go to Roster Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setRosterClassId(c.id);
                          setActiveTab('roster');
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-between transition-colors mt-2"
                      >
                        <span className="flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                          {studentCount > 0 ? '학생 명렬표 관리' : '엑셀 명렬표 등록하기'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Teacher Daily Question Registration (심플 학급별 1~17차시 질문 등록 & 차시 자동 연동) */}
      {activeTab === 'question' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-slate-950 border border-amber-400/40 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold mb-2">
                  <MessageSquareQuote className="w-3.5 h-3.5 text-amber-400" />
                  오늘의 질문 관리
                </div>
                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                  학급별 1~17차시 질문 등록 &amp; 차시 자동 연동
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  질문을 등록할 <strong className="text-amber-300">학급을 선택</strong>하고, 아래 <strong className="text-white">1차시부터 17차시까지</strong> 원하는 질문을 직접 입력해 두세요. 학급의 <strong className="text-amber-300">수업 차시를 변경하면 그 차시에 맞는 질문이 학생 수행자 화면에 자동으로 즉시 연동</strong>됩니다.
                </p>
              </div>

              {/* Quick Batch Save Button at Header */}
              {classes.length > 0 && (
                <button
                  type="button"
                  disabled={isSavingQuestion}
                  onClick={handleBatchSaveAllSessionsAction}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-center"
                >
                  <Save className="w-4 h-4" />
                  {isSavingQuestion && savedSessionNum === 'all'
                    ? '저장 중...'
                    : `${classes.find(c => c.id === questionClassId)?.name || '이 학급'} 1~17차시 전체 저장`}
                </button>
              )}
            </div>

            {/* Simple Floating Confirmation Toast */}
            {sessionSuccessToast && (
              <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-200">
                <div className="px-4 py-2 rounded-full bg-slate-900/95 border border-emerald-500/60 text-emerald-300 text-xs font-black flex items-center gap-2 shadow-2xl shadow-black/80 backdrop-blur-md">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{sessionSuccessToast}</span>
                </div>
              </div>
            )}

            {/* STEP 1: 학급 선택 가로 탭 바 (1반 ~ 11반) */}
            <div className="pt-3 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 block mb-2">
                1단계 &bull; 학급 선택 (반별로 질문을 다르게 등록할 수 있습니다):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-1.5">
                {classes.map(c => {
                  const isCurrent = c.id === questionClassId;
                  const cSess = activeSessions[c.id] || 1;
                  const classQuestions = (classSessionQuestions && classSessionQuestions[c.id]) || {};
                  const registeredCount = SESSIONS_1_TO_17.filter(n => Boolean(classQuestions[n]?.trim())).length;

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setQuestionClassId(c.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                        isCurrent
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20 font-black'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <span className="font-extrabold">{c.name.match(/\d+반/) ? c.name.match(/\d+반/)?.[0] : c.name}</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isCurrent ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                          {cSess}차시
                        </span>
                        {registeredCount > 0 && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-slate-950' : 'bg-emerald-400'}`} title={`${registeredCount}개 질문 등록됨`} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* STEP 2: 현재 선택된 학급의 수업 차시 설정 카드 */}
          {(() => {
            const currentClass = classes.find(c => c.id === questionClassId);
            const currentActiveSess = questionClassId ? (activeSessions[questionClassId] || 1) : 1;
            const currentActiveQ = (classQuestionsInput[currentActiveSess] || '').trim();

            return (
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-sm">
                      {currentClass?.name || '선택 학급'}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      현재 수업 차시 설정:
                    </span>
                    <select
                      value={currentActiveSess}
                      onChange={(e) => handleClassSessionSelectAction(questionClassId, Number(e.target.value))}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-400/60 text-amber-300 font-extrabold text-xs focus:outline-none focus:border-amber-400 cursor-pointer shadow-sm"
                    >
                      {SESSIONS_1_TO_17.map(n => (
                        <option key={n} value={n}>{n}차시</option>
                      ))}
                    </select>
                  </div>

                  <div className="text-xs">
                    {currentActiveQ ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        현재 [{currentActiveSess}차시] 질문이 학생 수행자 모드에 실시간 연동 중입니다.
                      </span>
                    ) : (
                      <span className="text-amber-400/90 font-medium flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        현재 [{currentActiveSess}차시]에 등록된 질문이 없습니다. (아래 {currentActiveSess}차시 항목에 질문을 입력해보세요)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* STEP 3: 1차시부터 17차시까지 쭉 나오는 질문 등록 목록 */}
          {(() => {
            const currentClass = classes.find(c => c.id === questionClassId);
            const currentActiveSess = questionClassId ? (activeSessions[questionClassId] || 1) : 1;

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    {currentClass?.name || '선택 학급'} 1~17차시 질문 목록
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    차시별 질문 입력 후 우측 [저장] 버튼을 누르거나, 상단 [전체 저장] 버튼을 누르면 영구 보존됩니다.
                  </span>
                </div>

                <div className="space-y-2.5">
                  {SESSIONS_1_TO_17.map(n => {
                    const isActiveSession = n === currentActiveSess;
                    const qText = classQuestionsInput[n] || '';
                    const isSavingThis = isSavingQuestion && savedSessionNum === n;

                    return (
                      <div
                        key={n}
                        className={`p-4 rounded-2xl transition-all border shadow-md flex flex-col md:flex-row md:items-center gap-3 ${
                          isActiveSession
                            ? 'bg-amber-950/20 border-amber-400/60 ring-1 ring-amber-400/30'
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Session Badge and Status */}
                        <div className="md:w-44 shrink-0 flex md:flex-col items-center md:items-start justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                              isActiveSession
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {n}차시
                            </span>
                            {isActiveSession && (
                              <span className="text-[11px] font-black text-amber-300 md:hidden">
                                ★ 현재 수업 차시
                              </span>
                            )}
                          </div>
                          {isActiveSession && (
                            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-black text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              현재 학생 화면 연동 중
                            </span>
                          )}
                        </div>

                        {/* Question Textarea */}
                        <div className="flex-1">
                          <textarea
                            rows={2}
                            value={qText}
                            onChange={(e) => {
                              isQuestionDirtyRef.current = true;
                              const val = e.target.value;
                              setClassQuestionsInput(prev => ({
                                ...prev,
                                [n]: val
                              }));
                            }}
                            placeholder={`${n}차시 질문을 입력하세요... (미입력 시 질문이 표시되지 않습니다)`}
                            className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400 text-xs leading-relaxed"
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                          {qText.trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                isQuestionDirtyRef.current = true;
                                setClassQuestionsInput(prev => ({ ...prev, [n]: '' }));
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-500 hover:text-rose-400 border border-slate-800 text-xs transition-colors cursor-pointer"
                              title="질문 내용 지우기"
                            >
                              지우기
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isSavingQuestion}
                            onClick={() => handleSaveSingleSessionAction(n)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                              isSavingThis
                                ? 'bg-emerald-500 text-white'
                                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm'
                            }`}
                          >
                            <Save className="w-3.5 h-3.5" />
                            {isSavingThis ? '저장됨!' : '저장'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Batch Save Button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={isSavingQuestion}
                    onClick={handleBatchSaveAllSessionsAction}
                    className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingQuestion && savedSessionNum === 'all'
                      ? '일괄 저장 중...'
                      : `${currentClass?.name || '이 학급'} 1~17차시 질문 전체 일괄 저장`}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* STEP 4: 학생 제출 답변 현황 확인 */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                  <CheckCheck className="w-5 h-5 text-emerald-400" />
                  {classes.find(c => c.id === questionClassId)?.name || '선택 학급'} 학생 답변 제출 내역
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  수행자 모드에서 학생들이 질문을 읽고 제출한 답변 목록입니다.
                </p>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400">차시 필터:</span>
                <select
                  value={answersFilterSession}
                  onChange={(e) => setAnswersFilterSession(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="all">1~17 전체 차시 답변</option>
                  {SESSIONS_1_TO_17.map(n => (
                    <option key={n} value={n}>{n}차시 답변만</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Answer List */}
            {(() => {
              const filteredAnswers = Object.values(studentAnswers)
                .filter(a => {
                  if (a.classId !== questionClassId) return false;
                  if (answersFilterSession !== 'all' && (a.session || 1) !== answersFilterSession) return false;
                  return true;
                })
                .sort((a, b) => a.studentNumber - b.studentNumber);

              if (filteredAnswers.length === 0) {
                return (
                  <div className="p-10 text-center rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-slate-500 text-xs">
                    <MessageSquareQuote className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="font-semibold text-slate-400 mb-0.5">제출된 학생 답변이 없습니다.</p>
                    <p className="text-slate-600">학생들이 수행자 모드에서 질문에 답변을 작성하여 제출하면 이곳에 실시간으로 표시됩니다.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredAnswers.map((ans) => (
                    <div
                      key={ans.id}
                      className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-2"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                              {ans.studentNumber}번
                            </span>
                            <span className="font-bold text-white text-sm">
                              {ans.studentName}
                            </span>
                            {ans.session && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-extrabold">
                                {ans.session}차시
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {new Date(ans.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 whitespace-pre-wrap">
                          {ans.answer || '(답변 내용 없음)'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 1: Teacher Feedback & Stars */}
      {activeTab === 'feedback' && (
        <form onSubmit={handleSubmitFeedback} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-rose-400" />
              학생별 교사 지도 피드백 & 별점 부여
            </h3>
            <span className="text-xs text-rose-400 font-bold bg-rose-400/10 px-2.5 py-1 rounded-lg border border-rose-400/20">
              교사 공식 권한
            </span>
          </div>

          {fbSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-between animate-in fade-in shadow-md">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">{fbSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setFbSuccessMsg('')}
                className="text-emerald-400 hover:text-white px-2 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {fbErrorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/60 text-rose-200 text-xs flex items-center justify-between animate-in fade-in shadow-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-bold">{fbErrorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setFbErrorMsg('')}
                className="text-rose-400 hover:text-white px-2 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Class & Student & Session selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                1. 학급 선택
              </label>
              <select
                value={fbClassId}
                onChange={(e) => {
                  setFbClassId(e.target.value);
                  setFbErrorMsg('');
                }}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-400 cursor-pointer"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5 flex items-center justify-between">
                <span>2. 지도할 대상 학생 선택</span>
                {targetStudent && (
                  <span className="text-rose-400 font-bold text-[11px] bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-500/40">
                    선택됨: {targetStudent.number}번 {targetStudent.name}
                  </span>
                )}
              </label>
              <select
                value={fbStudentId}
                onChange={(e) => {
                  setFbStudentId(e.target.value);
                  setFbErrorMsg('');
                }}
                className={`w-full p-2.5 rounded-xl bg-slate-950 border text-sm text-white focus:outline-none cursor-pointer transition-colors ${
                  !fbStudentId ? 'border-amber-500/60 focus:border-amber-400' : 'border-slate-800 focus:border-rose-400'
                }`}
              >
                <option value="">
                  {fbStudents.length === 0 ? '등록된 학생이 없습니다' : `학생을 선택하세요 (${fbStudents.length}명)`}
                </option>
                {fbStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.number}번 {s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5 flex items-center justify-between">
                <span>3. 수업 차시</span>
                <span className="text-amber-400 font-bold">{fbSession}차시</span>
              </label>
              <select
                value={fbSession}
                onChange={(e) => setFbSession(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-amber-300 font-extrabold focus:outline-none focus:border-rose-400 cursor-pointer"
              >
                {SESSIONS_1_TO_17.map(s => (
                  <option key={s} value={s}>{s}차시 피드백</option>
                ))}
              </select>
            </div>
          </div>

          {fbStudents.length === 0 && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                현재 학급({classes.find(c => c.id === fbClassId)?.name})에 등록된 학생이 없습니다. 상단의 <strong>[명렬표 관리]</strong> 탭에서 학생을 먼저 추가해주세요.
              </span>
            </div>
          )}

          {/* Shot type switch */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
              4. 슛 유형
            </label>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 max-w-xs">
              <button
                type="button"
                onClick={() => setFbShotType('middle')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  fbShotType === 'middle' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                미들슛
              </button>
              <button
                type="button"
                onClick={() => setFbShotType('layup')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  fbShotType === 'layup' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                레이업슛
              </button>
            </div>
          </div>

          {/* 4 Official Criteria Checklist */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              4. 공식 4대 기준 판정
            </label>
            <div className="space-y-2">
              {currentCriteria.map((c) => {
                const status = fbCriteria[c.id] || 'none';
                return (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-200 block">{c.shortName}</span>
                      <span className="text-[11px] text-slate-400">{c.text}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setFbCriteria(prev => ({ ...prev, [c.id]: prev[c.id] === 'good' ? 'none' : 'good' }))}
                        className={`px-2.5 py-1 rounded-lg font-bold border transition-all ${
                          status === 'good'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        잘함
                      </button>
                      <button
                        type="button"
                        onClick={() => setFbCriteria(prev => ({ ...prev, [c.id]: prev[c.id] === 'bad' ? 'none' : 'bad' }))}
                        className={`px-2.5 py-1 rounded-lg font-bold border transition-all ${
                          status === 'bad'
                            ? 'bg-rose-500 text-white border-rose-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        보완필요
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Star rating 1~3 */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
              5. 교사 부여 별의 개수 (1~3개)
            </label>
            <div className="flex items-center gap-3">
              {[1, 2, 3].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFbStars(val)}
                  className={`px-4 py-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${
                    fbStars === val
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Star className={`w-4 h-4 ${fbStars >= val ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                  별 {val}개
                </button>
              ))}
            </div>
          </div>

          {/* Teacher Comment */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
              6. 교사 전문 지도 코멘트
            </label>
            <textarea
              rows={3}
              value={fbComment}
              onChange={(e) => setFbComment(e.target.value)}
              placeholder="학생에게 전달할 전문적인 자세 교정 지도 코멘트를 입력하세요. (학생 피드백 목록에 [교사 지도] 배지로 표시됩니다)"
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-400"
            />
          </div>

          <button
            type="submit"
            disabled={isFbSubmitting}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-400 text-white font-extrabold text-sm transition-all shadow-lg shadow-rose-500/25 active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isFbSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>교사 지도 피드백 등록 중...</span>
              </>
            ) : (
              <>
                <Award className="w-4 h-4 text-white" />
                <span>교사 지도 피드백 및 별 등록</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* TAB 2: Class-by-Class Student Roster Management */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          {/* Quick link banner to Class Management */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Layers className="w-4 h-4 text-rose-400 shrink-0" />
              <span>반별 학급 등록 및 학급 수정/삭제는 <strong className="text-white">학급 관리</strong> 탭에서 관리할 수 있습니다.</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('classes')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white font-bold text-xs shrink-0 transition-colors self-start sm:self-center cursor-pointer"
            >
              학급 관리 탭으로 이동 &rarr;
            </button>
          </div>

          {/* Class Selector Bar */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                반별 학생 관리
              </span>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                {currentRosterClass?.name || '학급 선택'} 학생 명렬표
              </h3>
              <p className="text-xs text-slate-400">
                선택한 학급에 학생을 1명씩 등록하거나 명단을 복사해 한번에 등록할 수 있습니다.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-semibold shrink-0">학급 선택:</span>
              <select
                value={rosterClassId}
                onChange={(e) => setRosterClassId(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({students.filter(s => s.classId === c.id).length}명)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Class Selection Pills for fast class switching */}
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 block px-1">
              등록할 학급 바로 선택:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {classes.map(c => {
                const isSelected = c.id === rosterClassId;
                const count = students.filter(s => s.classId === c.id).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setRosterClassId(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                        : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>{c.name.match(/\d+반/) ? c.name.match(/\d+반/)?.[0] : c.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      isSelected ? 'bg-slate-950 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {count}명
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {rosterSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {rosterSuccessMsg}
            </div>
          )}

          {/* Registration Mode Selector (Unified per-class registration) */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setRosterInputType('paste')}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                rosterInputType === 'paste'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              선택 학급({currentRosterClass?.name}) 명단 붙여넣기 (엑셀/텍스트)
            </button>
            <button
              type="button"
              onClick={() => setRosterInputType('single')}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                rosterInputType === 'single'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              학생 1명씩 직접 추가
            </button>
          </div>

          {/* Form 1: Single Student Add */}
          {rosterInputType === 'single' && (
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  {currentRosterClass?.name} 학생 개별 등록
                </h4>
                <span className="text-xs text-slate-400">
                  현재 등록 학생: <strong className="text-emerald-400">{currentClassStudents.length}명</strong>
                </span>
              </div>

              <form onSubmit={handleAddSingleStudent} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 font-semibold shrink-0">번호:</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={singleStudentNum}
                    onChange={(e) => setSingleStudentNum(e.target.value)}
                    className="w-20 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white text-center focus:outline-none focus:border-emerald-400"
                    placeholder="번호"
                  />
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs text-slate-400 font-semibold shrink-0">이름:</label>
                  <input
                    type="text"
                    value={singleStudentName}
                    onChange={(e) => setSingleStudentName(e.target.value)}
                    placeholder="학생 이름 입력 (예: 김철수)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!singleStudentName.trim() || isRosterSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all disabled:opacity-40 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <PlusCircle className="w-4 h-4" />
                  학생 추가
                </button>
              </form>
            </div>
          )}

          {/* Form 2: Paste Multiple Students (Excel/Text) */}
          {rosterInputType === 'paste' && (
            <form onSubmit={handleBulkSubmit} className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  {currentRosterClass?.name} 명단 붙여넣기
                </h4>

                {/* Mode selection */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-400 font-semibold">등록 방식:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="rosterMode"
                      checked={rosterMode === 'replace'}
                      onChange={() => setRosterMode('replace')}
                    />
                    기존 명단 전체 교체
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="rosterMode"
                      checked={rosterMode === 'append'}
                      onChange={() => setRosterMode('append')}
                    />
                    기존 명단에 추가
                  </label>
                </div>
              </div>

              {/* Textarea for Excel paste */}
              <div>
                <textarea
                  rows={6}
                  value={rawExcelText}
                  onChange={(e) => setRawExcelText(e.target.value)}
                  placeholder={`엑셀이나 스프레드시트에서 번호와 이름을 복사하여 붙여넣으세요.
예시:
1\t강민준
2\t김도윤
3\t박서준
(또는 '1 강민준', '2 김도윤' 등 공백이나 쉼표 구분도 자동 인식됩니다)`}
                  className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Real-time Parsed Preview Table */}
              {parsedPreview.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-300">
                      인식된 학생 명단 미리보기 ({parsedPreview.length}명)
                    </span>
                    <span className="text-slate-400">학번과 이름이 정상적으로 분리되었는지 확인하세요</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {parsedPreview.map((item, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[11px]">
                          {item.num}
                        </span>
                        <span className="font-semibold text-slate-100 truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isRosterSubmitting || parsedPreview.length === 0}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 cursor-pointer"
              >
                {isRosterSubmitting ? '저장 중...' : `${currentRosterClass?.name || ''} 학생 명단 저장하기 (${parsedPreview.length}명)`}
              </button>
            </form>
          )}

          {/* Current Class Student List */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                현재 등록된 {currentRosterClass?.name} 학생 명단
                <span className="text-xs font-normal text-slate-400">
                  (총 <strong className="text-emerald-400">{currentClassStudents.length}</strong>명)
                </span>
              </h4>
            </div>

            {currentClassStudents.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-slate-400 text-xs">
                아직 등록된 학생이 없습니다. 상단의 '학생 1명씩 직접 등록' 또는 '명단 복사-붙여넣기'로 학생을 등록해주세요.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {currentClassStudents.map((st) => (
                  <div
                    key={st.id}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2 group hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-6 h-6 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/20 flex items-center justify-center font-bold text-[11px] shrink-0">
                        {st.number}
                      </span>
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {st.name}
                      </span>
                    </div>

                    {onDeleteStudent && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSingleStudent(st.id, st.name)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors opacity-60 group-hover:opacity-100"
                        title={`${st.name} 학생 삭제`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Data Management & CSV Export */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Data Safety & Backup Section */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base flex items-center gap-2">
                    데이터 안전 보관 & 백업/복원
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Google Cloud Firestore 클라우드 영구 저장 활성화
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    등록한 전체 학급 및 학생 명렬표, 피드백, 질문/답변은 Google Cloud Firestore 클라우드 데이터베이스에 실시간으로 영구 저장됩니다. 서버가 재부팅되거나 새 컨테이너로 교체되어도 언제나 완벽하게 유지됩니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {/* 1. Download Backup JSON */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                  <Download className="w-4 h-4 text-emerald-400" />
                  명렬표 백업 파일 다운로드 (.json)
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  현재 등록된 모든 학급({classes.length}개) 및 학생({students.length}명) 명단을 컴퓨터에 JSON 파일로 안전하게 보관합니다.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  백업 파일 다운로드
                </button>
              </div>

              {/* 2. Upload and Restore Backup JSON */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                  <Upload className="w-4 h-4 text-sky-400" />
                  백업 파일 불러오기 (.json 파일 복원)
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  이전에 내려받은 백업 JSON 파일을 업로드하여 학급과 학생 명단을 즉시 복원합니다.
                </p>
                <label className="w-full py-2 px-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  백업 파일 선택 및 복원
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUploadBackup}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 3. Browser Cache Restore */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  브라우저 로컬 캐시에서 복원
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {cachedBackup
                    ? `브라우저에 보관된 명렬표: ${cachedBackup.classes.length}개 반 (${cachedBackup.students.length}명)`
                    : '현재 브라우저에 임시 캐시된 명렬표가 없습니다.'}
                </p>
                <button
                  type="button"
                  disabled={!cachedBackup}
                  onClick={async () => {
                    if (!cachedBackup) return;
                    if (confirm(`브라우저에 보관된 학생 ${cachedBackup.students.length}명의 명렬표로 복원하시겠습니까?`)) {
                      if (onImportState) {
                        const ok = await onImportState({ classes: cachedBackup.classes, students: cachedBackup.students });
                        if (ok) {
                          alert(`${cachedBackup.students.length}명의 학생 명단이 복원되었습니다.`);
                        }
                      }
                    }
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  로컬 캐시에서 즉시 복원
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Export CSV Card */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base">체육 수업 피드백 CSV 내보내기</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                현재까지 학생들이 주고받은 모든 미들슛, 레이업슛 피드백 및 별점 통계를 엑셀 호환 CSV 파일로 내려받아 성적 산출 및 수행평가 보조자료로 활용할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all shadow-md"
              >
                <Download className="w-4 h-4" />
                CSV 다운로드 ({feedbacks.length}건)
              </button>
            </div>

            {/* Reset to Sample Demo Data */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base">수업용 시연 샘플 데이터 복원</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                1반, 2반, 3반 기본 명렬표 샘플을 다시 불러옵니다. 학생 시연 전 초기 상태로 돌아갈 때 유용합니다.
              </p>
              <button
                type="button"
                onClick={async () => {
                  if (confirm('모든 학급 및 학생 데이터가 초기 샘플로 복원됩니다. 계속하시겠습니까?')) {
                    setIsResetting(true);
                    await onResetData();
                    setIsResetting(false);
                    alert('초기 샘플 데이터로 복원되었습니다.');
                  }
                }}
                disabled={isResetting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 text-slate-300 font-bold text-xs border border-slate-700 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
                {isResetting ? '복원 중...' : '샘플 데이터로 재설정'}
              </button>
            </div>

            {/* Granular Feedback & Star Data Reset Console (교사 권한 정밀 데이터 초기화) */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-rose-900/50 space-y-5 sm:col-span-2 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

              {/* Toast Notification */}
              {clearResultToast && (
                <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2 ${
                  clearResultToast.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {clearResultToast.type === 'success' ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                    <span>{clearResultToast.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClearResultToast(null)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-base flex items-center gap-2">
                      <span>학급별 · 슛 유형별 정밀 데이터 초기화</span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                        교사 전용 권한
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      특정 학급(예: 3학년 7반)과 슛 유형(미들슛 / 레이업슛)을 지정하여 오고 간 피드백과 누적된 별점을 안전하게 초기화합니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-start bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 shrink-0 text-xs">
                  <span className="text-slate-400">전체 누적:</span>
                  <span className="font-bold text-amber-400">피드백 {feedbacks.length}건</span>
                  <span className="text-slate-600">·</span>
                  <span className="font-bold text-amber-400">
                    별 {feedbacks.reduce((sum, f) => sum + (Number(f.stars) || 0) + (f.favoriteRewarded ? 1 : 0), 0)}개
                  </span>
                </div>
              </div>

              {/* Filtering Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                {/* 1. Target Class Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-rose-400" />
                    1. 대상 학급 선택
                  </label>
                  <select
                    value={clearTargetClassId}
                    onChange={(e) => {
                      setClearTargetClassId(e.target.value);
                      setClearTargetStudentId('all');
                      setConfirmClearStep(false);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-medium focus:outline-none focus:border-rose-400 transition-colors"
                  >
                    <option value="all">전체 학급 (총 {feedbacks.length}건)</option>
                    {classes.map(c => {
                      const cnt = feedbacks.filter(f => f.classId === c.id).length;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} ({cnt}건)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Target Shot Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                    2. 슛 유형 선택
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setClearTargetShotType('all');
                        setConfirmClearStep(false);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        clearTargetShotType === 'all'
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      전체 슛
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClearTargetShotType('middle');
                        setConfirmClearStep(false);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        clearTargetShotType === 'middle'
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'text-amber-300/70 hover:text-amber-300'
                      }`}
                    >
                      미들슛만
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClearTargetShotType('layup');
                        setConfirmClearStep(false);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        clearTargetShotType === 'layup'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'text-rose-300/70 hover:text-rose-300'
                      }`}
                    >
                      레이업만
                    </button>
                  </div>
                </div>

                {/* 3. Target Student Filter (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    3. 대상 학생 필터
                  </label>
                  <select
                    value={clearTargetStudentId}
                    onChange={(e) => {
                      setClearTargetStudentId(e.target.value);
                      setConfirmClearStep(false);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-medium focus:outline-none focus:border-rose-400 transition-colors"
                  >
                    <option value="all">
                      {clearTargetClassId === 'all' ? '전체 학생 대상' : '학급 학생 전체'}
                    </option>
                    {clearTargetStudents.map(s => {
                      const studentFbCnt = feedbacks.filter(
                        f => (f.performerId === s.id || f.observerId === s.id) &&
                             (clearTargetShotType === 'all' || f.shotType === clearTargetShotType)
                      ).length;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.number}번 {s.name} (관련 {studentFbCnt}건)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 4. Target Session Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    4. 수업 차시 필터
                  </label>
                  <select
                    value={clearTargetSession}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClearTargetSession(val === 'all' ? 'all' : Number(val));
                      setConfirmClearStep(false);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-medium focus:outline-none focus:border-rose-400 transition-colors"
                  >
                    <option value="all">전체 차시 모두</option>
                    {SESSIONS_1_TO_17.map(s => (
                      <option key={s} value={s}>{s}차시 피드백만</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Extra Options */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={clearIncludeAi}
                    onChange={(e) => setClearIncludeAi(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-rose-500 focus:ring-rose-500/20 bg-slate-950"
                  />
                  <span>해당 조건의 🤖 AI 종합 평가 리포트 캐시도 함께 초기화 (재평가 가능하도록 갱신)</span>
                </label>
              </div>

              {/* Real-time Impact Preview Card */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    선택 조건 영향 범위 미리보기
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono">
                    {clearTargetClassId === 'all' ? '전체 학급' : classes.find(c => c.id === clearTargetClassId)?.name}
                    {' · '}
                    {clearTargetShotType === 'all' ? '전체 슛' : (clearTargetShotType === 'middle' ? '미들슛' : '레이업슛')}
                    {clearTargetSession !== 'all' && ` · ${clearTargetSession}차시`}
                    {clearTargetStudentId !== 'all' && ` · ${clearTargetStudents.find(s => s.id === clearTargetStudentId)?.name || '학생'}`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 text-center">
                    <span className="text-[11px] text-slate-400 block mb-0.5">삭제 대상 피드백</span>
                    <span className={`text-base font-extrabold ${matchedClearFeedbacks.length > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                      {matchedClearFeedbacks.length}건
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 text-center">
                    <span className="text-[11px] text-slate-400 block mb-0.5">초기화될 별점 합계</span>
                    <span className={`text-base font-extrabold ${matchedClearStars > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {matchedClearStars}개
                      {matchedClearRewardedStars > 0 && (
                        <span className="text-[10px] font-normal text-amber-400/70 block">
                          (보답별 {matchedClearRewardedStars}개 포함)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 text-center">
                    <span className="text-[11px] text-slate-400 block mb-0.5">영향받는 학생</span>
                    <span className={`text-base font-extrabold ${matchedClearUniqueStudents > 0 ? 'text-sky-400' : 'text-slate-500'}`}>
                      {matchedClearUniqueStudents}명
                    </span>
                  </div>
                </div>
              </div>

              {/* 2-Step Confirmation Execution Button */}
              {!confirmClearStep ? (
                <button
                  type="button"
                  disabled={isClearingFeedbacks || matchedClearFeedbacks.length === 0}
                  onClick={() => setConfirmClearStep(true)}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs transition-all shadow-md ${
                    matchedClearFeedbacks.length === 0
                      ? 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
                      : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 cursor-pointer shadow-rose-500/10'
                  }`}
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>
                    {matchedClearFeedbacks.length === 0
                      ? '초기화할 데이터가 없습니다 (0건)'
                      : `${clearTargetClassId === 'all' ? '전체 학급' : classes.find(c => c.id === clearTargetClassId)?.name} ${
                          clearTargetShotType === 'all' ? '모든 슛' : (clearTargetShotType === 'middle' ? '미들슛' : '레이업슛')
                        } 피드백 및 별점 초기화 (${matchedClearFeedbacks.length}건)`}
                  </span>
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-500/60 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="text-xs text-rose-200">
                    <p className="font-extrabold flex items-center gap-1.5 text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
                      정말 초기화하시겠습니까? (삭제된 피드백과 별점은 복구할 수 없습니다)
                    </p>
                    <p className="text-[11px] text-rose-300/80 mt-0.5">
                      대상: {clearTargetClassId === 'all' ? '전체 학급' : classes.find(c => c.id === clearTargetClassId)?.name} · 
                      {clearTargetShotType === 'all' ? ' 모든 슛' : (clearTargetShotType === 'middle' ? ' 미들슛' : ' 레이업슛')} · 
                      총 {matchedClearFeedbacks.length}건의 피드백과 {matchedClearStars}개의 별점이 영구 삭제됩니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleClearFeedbacksAction}
                      disabled={isClearingFeedbacks}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isClearingFeedbacks ? '초기화 처리 중...' : '네, 지금 즉시 초기화'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearStep(false)}
                      disabled={isClearingFeedbacks}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Items Management List */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-white text-base flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  등록된 관찰 피드백 목록 및 개별 관리
                </h4>
                <p className="text-xs text-slate-400">
                  학생들이 제출한 관찰 피드백을 실시간으로 확인하고, 부적절하거나 잘못 기록된 피드백을 개별 삭제할 수 있습니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 shrink-0">학급 필터:</span>
                <select
                  value={feedbackViewFilter}
                  onChange={(e) => setFeedbackViewFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-400"
                >
                  <option value="all">전체 학급 ({feedbacks.length}건)</option>
                  {classes.map(c => {
                    const cnt = feedbacks.filter(f => f.classId === c.id).length;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({cnt}건)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* List */}
            {(() => {
              const displayedFeedbacks = feedbackViewFilter === 'all'
                ? feedbacks
                : feedbacks.filter(f => f.classId === feedbackViewFilter);

              if (displayedFeedbacks.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-500 rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
                    <Check className="w-8 h-8 mx-auto mb-2 text-emerald-400/60" />
                    <p className="text-sm font-semibold text-slate-400">등록된 관찰 피드백이 없습니다 (0건)</p>
                    <p className="text-xs text-slate-600 mt-1">학생들이 관찰자 모드에서 피드백을 작성하면 여기에 표시됩니다.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {displayedFeedbacks.map((fb) => {
                    const cls = classes.find(c => c.id === fb.classId);
                    return (
                      <div
                        key={fb.id}
                        className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group transition-all"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold text-[11px]">
                              {cls?.name || '미지정'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-sky-950/60 text-sky-300 border border-sky-800/50 font-semibold text-[11px]">
                              {fb.shotType === 'middle' ? '미들슛' : '레이업슛'}
                            </span>
                            <span className="text-xs font-bold text-white">
                              수행: <span className="text-amber-300">{fb.performerName}</span>
                            </span>
                            <span className="text-slate-500 text-xs">←</span>
                            <span className="text-xs text-slate-300">
                              관찰: <span className="font-semibold text-slate-200">{fb.isTeacher ? '체육선생님' : fb.observerName}</span>
                            </span>
                            <div className="flex items-center text-amber-400 text-xs ml-1">
                              {Array.from({ length: fb.stars }).map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-amber-400" />
                              ))}
                            </div>
                            {fb.favoriteRewarded && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-400/15 px-1.5 py-0.5 rounded border border-amber-400/30">
                                <Heart className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                보답별 +1
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500 ml-auto">
                              {new Date(fb.timestamp).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800/40">
                            "{fb.comment || '별도 코멘트 없음'}"
                          </p>
                        </div>

                        {onDeleteFeedback && (
                          <div className="sm:self-center shrink-0">
                            {confirmDeleteFbId === fb.id ? (
                              <div className="flex items-center gap-1.5 animate-in fade-in">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFeedbackAction(fb.id)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded-lg cursor-pointer"
                                >
                                  삭제
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteFbId(null)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg cursor-pointer"
                                >
                                  취소
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteFbId(fb.id)}
                                className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                                title="이 피드백 삭제"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
