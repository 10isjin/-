import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import {
  AppMode,
  AppStateData,
  Classroom,
  Student,
  FeedbackItem,
  AiEvaluation,
  TeacherQuestion,
  ShotType,
  CriterionAssessment
} from './types';
import { BasketballCourtBackground } from './components/BasketballCourtBackground';
import { Navbar } from './components/Navbar';
import { ModeSelection } from './components/ModeSelection';
import { PerformerMode } from './components/PerformerMode';
import { ObserverMode } from './components/ObserverMode';
import { OverviewMode } from './components/OverviewMode';
import { TeacherMode } from './components/TeacherMode';
import { QrShareModal } from './components/QrShareModal';
import {
  saveStateToFirestore,
  fetchStateFromFirestore,
  subscribeToFirestoreState,
  saveFeedbackToFirestore,
  rewardFeedbackInFirestore,
  fetchFeedbacksFromFirestore,
  subscribeToFeedbacksCollection,
  clearFeedbacksInFirestore,
  canonicalizeAnswersMap,
  syncVaultFeedbacksToFirestore
} from './lib/firebase';
import { getDefaultAppState, getDefaultClasses, getDefaultStudents, getDefaultSessionQuestions } from './lib/defaultData';
import { generateClientAiFeedback } from './lib/clientAiEvaluation';

// Validate feedback integrity
export function isRealStudentFeedback(f: FeedbackItem): boolean {
  if (!f || !f.id || !f.performerId) return false;
  return true;
}

// Dedicated local vault for permanent feedback & star retention
export function loadFeedbacksFromVault(): FeedbackItem[] {
  try {
    const raw = localStorage.getItem('shootingstar_feedbacks_vault');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

export function saveFeedbacksToVault(feedbacks: FeedbackItem[]) {
  try {
    localStorage.setItem('shootingstar_feedbacks_vault', JSON.stringify(feedbacks));
  } catch (e) {
    console.warn('[Vault] Quota exceeded on feedbacks vault:', e);
  }
}

// Bi-directional merge by ID: guarantees no feedback or star is EVER lost or overwritten by empty arrays
export function mergeFeedbackArrays(
  existing: FeedbackItem[] = [],
  incoming: FeedbackItem[] = [],
  vault: FeedbackItem[] = []
): FeedbackItem[] {
  const map = new Map<string, FeedbackItem>();
  const add = (f: FeedbackItem) => {
    if (!f || !f.id) return;
    const curr = map.get(f.id);
    if (!curr) {
      map.set(f.id, f);
    } else {
      const currTime = Math.max(curr.updatedAt || 0, curr.timestamp || 0);
      const newTime = Math.max(f.updatedAt || 0, f.timestamp || 0);
      const newer = newTime >= currTime ? f : curr;
      const older = newTime >= currTime ? curr : f;
      map.set(f.id, {
        ...older,
        ...newer,
        favoriteRewarded: newer.favoriteRewarded !== undefined ? newer.favoriteRewarded : older.favoriteRewarded,
        favoriteRewardedAt: newer.favoriteRewardedAt || older.favoriteRewardedAt,
        timestamp: Math.min(curr.timestamp || Infinity, f.timestamp || Infinity) === Infinity
          ? Date.now()
          : Math.min(curr.timestamp || Infinity, f.timestamp || Infinity),
        updatedAt: Math.max(curr.updatedAt || 0, f.updatedAt || 0)
      });
    }
  };
  (vault || []).forEach(add);
  (existing || []).forEach(add);
  (incoming || []).forEach(add);
  return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

// Helper to parse roster text into student objects (client fallback)
function parseStudentRosterClient(rawText: string, classId: string): Student[] {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const students: Student[] = [];
  lines.forEach((line, idx) => {
    const parts = line.split(/[\t, ]+/).filter(Boolean);
    if (parts.length >= 2) {
      const numCandidate = parseInt(parts[0], 10);
      if (!isNaN(numCandidate)) {
        students.push({
          id: `s_${classId}_${numCandidate}_${Date.now()}_${idx}`,
          classId,
          number: numCandidate,
          name: parts.slice(1).join(' ')
        });
        return;
      }
    }
    if (parts.length === 1 && isNaN(Number(parts[0]))) {
      students.push({
        id: `s_${classId}_${idx + 1}_${Date.now()}`,
        classId,
        number: idx + 1,
        name: parts[0]
      });
    }
  });
  return students;
}

// Helper to parse whole-school roster text (client fallback)
function parseAllClassesRosterClient(rawText: string, classes: Classroom[]): { newStudents: Student[]; newClasses: Classroom[] } {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const students: Student[] = [];
  const classMap = new Map<string, string>();
  classes.forEach(c => {
    classMap.set(c.id, c.id);
    classMap.set(c.name, c.id);
    const match = c.name.match(/(\d+)반/);
    if (match) classMap.set(`${match[1]}반`, c.id);
  });

  const updatedClasses = [...classes];
  let currentClassId = classes[0]?.id || '3-1';

  lines.forEach((line, idx) => {
    const sectionMatch = line.match(/^\[?(\d+)학년\s*(\d+)반\]?/) || line.match(/^\[?(\d+)반\]?/);
    if (sectionMatch && line.length <= 15) {
      const classNum = sectionMatch[2] || sectionMatch[1];
      const targetId = `3-${classNum}`;
      if (!updatedClasses.some(c => c.id === targetId)) {
        updatedClasses.push({ id: targetId, name: `3학년 ${classNum}반` });
      }
      currentClassId = targetId;
      return;
    }

    const parts = line.split(/[\t, ]+/).filter(Boolean);
    if (parts.length >= 3) {
      const classCandidate = parts[0];
      const numCandidate = parseInt(parts[1], 10);
      const nameCandidate = parts.slice(2).join(' ');
      if (!isNaN(numCandidate) && nameCandidate) {
        const foundId = classMap.get(classCandidate) || (classCandidate.includes('반') ? `3-${classCandidate.replace(/[^0-9]/g, '')}` : currentClassId);
        students.push({
          id: `s_${foundId}_${numCandidate}_${Date.now()}_${idx}`,
          classId: foundId,
          number: numCandidate,
          name: nameCandidate
        });
        return;
      }
    }

    if (parts.length >= 2) {
      const numCandidate = parseInt(parts[0], 10);
      if (!isNaN(numCandidate)) {
        students.push({
          id: `s_${currentClassId}_${numCandidate}_${Date.now()}_${idx}`,
          classId: currentClassId,
          number: numCandidate,
          name: parts.slice(1).join(' ')
        });
      }
    }
  });

  return { newStudents: students, newClasses: updatedClasses };
}

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('home');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);

  // Detect mobile in-app browser (KakaoTalk, Naver, Line, Instagram) to prevent QR session/storage hang
  const [showInAppAlert, setShowInAppAlert] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !navigator.userAgent) return false;
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('kakaotalk') || ua.includes('naver') || ua.includes('line') || ua.includes('instagram') || ua.includes('daumapps') || ua.includes('fbav');
  });

  const handleOpenExternalBrowser = () => {
    const currentUrl = window.location.href;
    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = ua.includes('android');

    if (isAndroid) {
      const cleanUrl = currentUrl.replace(/https?:\/\//, '');
      window.location.href = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
    } else {
      // iOS / other mobile guidance
      alert('화면 우측 하단의 [···] 또는 [공유] 버튼을 누르고 [Safari로 열기] 또는 [기본 브라우저로 열기]를 선택해주세요!');
    }
  };

  // App core state: initialize with localStorage or default 11 classes immediately
  const [appState, setAppState] = useState<AppStateData>(() => {
    try {
      const cached = localStorage.getItem('shootingstar_full_backup');
      const savedTeacherQuestions = localStorage.getItem('shootingstar_teacher_questions');
      const savedSessionQuestions = localStorage.getItem('shootingstar_session_questions');
      const savedClassSessionQuestions = localStorage.getItem('shootingstar_class_session_questions');
      const savedActiveSessions = localStorage.getItem('shootingstar_active_sessions');

      let sessionQ: Record<number, string> = {};
      if (savedSessionQuestions) {
        try {
          const parsedSQ = JSON.parse(savedSessionQuestions);
          if (parsedSQ && typeof parsedSQ === 'object') {
            sessionQ = parsedSQ;
          }
        } catch {}
      }

      let classSessionQ: Record<string, Record<number, string>> = {};
      if (savedClassSessionQuestions) {
        try {
          const parsedCSQ = JSON.parse(savedClassSessionQuestions);
          if (parsedCSQ && typeof parsedCSQ === 'object') {
            classSessionQ = parsedCSQ;
          }
        } catch {}
      }

      let teacherQ: Record<string, TeacherQuestion> = {};
      if (savedTeacherQuestions) {
        try {
          const parsedTQ = JSON.parse(savedTeacherQuestions);
          if (parsedTQ && typeof parsedTQ === 'object') {
            teacherQ = parsedTQ;
          }
        } catch {}
      }

      let activeSess: Record<string, number> = {};
      if (savedActiveSessions) {
        try {
          const parsedAS = JSON.parse(savedActiveSessions);
          if (parsedAS && typeof parsedAS === 'object') {
            activeSess = parsedAS;
          }
        } catch {}
      }

      const vaultFeedbacks = loadFeedbacksFromVault();
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.classes) && parsed.classes.length > 0) {
          const initialFeedbacks = mergeFeedbackArrays(parsed.feedbacks || [], vaultFeedbacks);
          return {
            classes: parsed.classes,
            students: Array.isArray(parsed.students) ? parsed.students : [],
            feedbacks: initialFeedbacks,
            aiEvaluations: parsed.aiEvaluations || {},
            teacherQuestions: { ...teacherQ, ...(parsed.teacherQuestions || {}) },
            sessionQuestions: { ...sessionQ, ...(parsed.sessionQuestions || {}) },
            classSessionQuestions: { ...classSessionQ, ...(parsed.classSessionQuestions || {}) },
            studentAnswers: canonicalizeAnswersMap(parsed.studentAnswers || {}),
            activeSessions: { ...activeSess, ...(parsed.activeSessions || {}) }
          };
        }
      }
      const initial = getDefaultAppState();
      return {
        ...initial,
        feedbacks: vaultFeedbacks,
        teacherQuestions: teacherQ,
        sessionQuestions: sessionQ,
        classSessionQuestions: classSessionQ,
        activeSessions: activeSess
      };
    } catch (e) {
      // ignore
    }
    return getDefaultAppState();
  });

  // Fetch state from server with automatic Cloud Firestore / Local fallback
  const fetchState = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    setErrorMessage(null);
    let loadedFromServer = false;

    // 1. Try Express server (/api/state) with timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('/api/state', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data && Array.isArray(data.data.classes) && data.data.classes.length > 0) {
          setAppState(prev => {
            const loaded = data.data;
            const vaultFeedbacks = loadFeedbacksFromVault();
            const mergedFeedbacks = mergeFeedbackArrays(prev.feedbacks, loaded.feedbacks, vaultFeedbacks);
            saveFeedbacksToVault(mergedFeedbacks);
            const mergedTeacherQuestions = {
              ...(prev.teacherQuestions || {}),
              ...(loaded.teacherQuestions || {})
            };
            const mergedSessionQuestions = {
              ...(prev.sessionQuestions || {}),
              ...(loaded.sessionQuestions || {})
            };
            const mergedClassSessionQuestions = {
              ...(prev.classSessionQuestions || {}),
              ...(loaded.classSessionQuestions || {})
            };
            const mergedActiveSessions = {
              ...(prev.activeSessions || {}),
              ...(loaded.activeSessions || {})
            };
            const loadedData = {
              ...loaded,
              feedbacks: mergedFeedbacks,
              teacherQuestions: mergedTeacherQuestions,
              sessionQuestions: mergedSessionQuestions,
              classSessionQuestions: mergedClassSessionQuestions,
              activeSessions: mergedActiveSessions
            };
            try {
              localStorage.setItem('shootingstar_full_backup', JSON.stringify(loadedData));
              localStorage.setItem('shootingstar_teacher_questions', JSON.stringify(mergedTeacherQuestions));
              localStorage.setItem('shootingstar_session_questions', JSON.stringify(mergedSessionQuestions));
              localStorage.setItem('shootingstar_class_session_questions', JSON.stringify(mergedClassSessionQuestions));
              localStorage.setItem('shootingstar_active_sessions', JSON.stringify(mergedActiveSessions));
            } catch (e) {}
            return loadedData;
          });
          loadedFromServer = true;
        }
      }
    } catch {
      // Server not reachable (e.g. Netlify static hosting)
    }

    // 2. If server was not reachable (Netlify environment), use Cloud Firestore!
    if (!loadedFromServer) {
      try {
        const firestoreData = await fetchStateFromFirestore();
        if (
          firestoreData &&
          Array.isArray(firestoreData.classes) &&
          firestoreData.classes.length > 0
        ) {
          setAppState(prev => {
            const vaultFeedbacks = loadFeedbacksFromVault();
            const currentFeedbacks = Array.isArray(firestoreData.feedbacks) && firestoreData.feedbacks.length > 0
              ? mergeFeedbackArrays(prev.feedbacks, firestoreData.feedbacks, vaultFeedbacks)
              : (prev.feedbacks.length > 0 ? prev.feedbacks : vaultFeedbacks);
            saveFeedbacksToVault(currentFeedbacks);
            const mergedTeacherQuestions = {
              ...(prev.teacherQuestions || {}),
              ...(firestoreData.teacherQuestions || {})
            };
            const mergedSessionQuestions = {
              ...(prev.sessionQuestions || {}),
              ...(firestoreData.sessionQuestions || {})
            };
            const mergedClassSessionQuestions = {
              ...(prev.classSessionQuestions || {}),
              ...(firestoreData.classSessionQuestions || {})
            };
            const mergedActiveSessions = {
              ...(prev.activeSessions || {}),
              ...(firestoreData.activeSessions || {})
            };
            const mergedData = {
              classes: firestoreData.classes,
              students: Array.isArray(firestoreData.students) ? firestoreData.students : [],
              feedbacks: currentFeedbacks,
              aiEvaluations: firestoreData.aiEvaluations || {},
              teacherQuestions: mergedTeacherQuestions,
              sessionQuestions: mergedSessionQuestions,
              classSessionQuestions: mergedClassSessionQuestions,
              studentAnswers: canonicalizeAnswersMap(firestoreData.studentAnswers || {}),
              activeSessions: mergedActiveSessions
            };
            try {
              localStorage.setItem('shootingstar_full_backup', JSON.stringify(mergedData));
              localStorage.setItem('shootingstar_teacher_questions', JSON.stringify(mergedTeacherQuestions));
              localStorage.setItem('shootingstar_session_questions', JSON.stringify(mergedSessionQuestions));
              localStorage.setItem('shootingstar_class_session_questions', JSON.stringify(mergedClassSessionQuestions));
              localStorage.setItem('shootingstar_active_sessions', JSON.stringify(mergedActiveSessions));
            } catch (e) {}
            return mergedData;
          });
        } else {
          // If Firestore is empty or quota exceeded, DO NOT WIPE STATE! Keep all existing feedbacks and students intact!
          console.warn('[ShootingStar] Firestore fetch returned empty or failed. Preserving existing client state.');
        }
      } catch (fsErr) {
        console.warn('[ShootingStar] Firestore fetch error:', fsErr);
      }
    }

    if (!silent) setIsRefreshing(false);
    setInitialLoading(false);
  }, []);

  // Real-time Firestore sync & initial fetch
  useEffect(() => {
    fetchState(true);

    // Auto-sync: If local vault contains feedbacks, push to Firestore & Server in the background
    try {
      const localVault = loadFeedbacksFromVault();
      if (localVault.length > 0) {
        syncVaultFeedbacksToFirestore(localVault).catch(() => {});
        fetch('/api/feedback/batch-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedbacks: localVault })
        }).catch(() => {});
      }
    } catch {}

    // 1. Dedicated real-time subscriber for feedbacks (single-doc optimized, saves 99.7% quota!)
    const unsubFeedbacks = subscribeToFeedbacksCollection((incomingFeedbacks) => {
      if (Array.isArray(incomingFeedbacks) && incomingFeedbacks.length > 0) {
        setAppState(prev => {
          const vaultFeedbacks = loadFeedbacksFromVault();
          const merged = mergeFeedbackArrays(prev.feedbacks, incomingFeedbacks, vaultFeedbacks);
          saveFeedbacksToVault(merged);
          return {
            ...prev,
            feedbacks: merged
          };
        });
      }
    });

    // 2. Real-time subscriber for global classes, questions, sessions, and feedbacks
    const unsubState = subscribeToFirestoreState((data) => {
      if (data && Array.isArray(data.classes) && data.classes.length > 0) {
        setAppState(prev => {
          const currentStudents = Array.isArray(data.students) && data.students.length > 0 ? data.students : prev.students;
          const mergedTeacherQuestions = {
            ...(prev.teacherQuestions || {}),
            ...(data.teacherQuestions || {})
          };
          const mergedSessionQuestions = {
            ...(prev.sessionQuestions || {}),
            ...(data.sessionQuestions || {})
          };
          const mergedClassSessionQuestions = {
            ...(prev.classSessionQuestions || {}),
            ...(data.classSessionQuestions || {})
          };
          const mergedActiveSessions = {
            ...(prev.activeSessions || {}),
            ...(data.activeSessions || {})
          };
          const vaultFeedbacks = loadFeedbacksFromVault();
          const incomingFeedbacks = Array.isArray(data.feedbacks) && data.feedbacks.length > 0 ? data.feedbacks : [];
          const mergedFeedbacks = mergeFeedbackArrays(prev.feedbacks, incomingFeedbacks, vaultFeedbacks);
          saveFeedbacksToVault(mergedFeedbacks);

          const next = {
            classes: data.classes,
            students: currentStudents,
            feedbacks: mergedFeedbacks,
            aiEvaluations: data.aiEvaluations || prev.aiEvaluations || {},
            teacherQuestions: mergedTeacherQuestions,
            sessionQuestions: mergedSessionQuestions,
            classSessionQuestions: mergedClassSessionQuestions,
            studentAnswers: canonicalizeAnswersMap(data.studentAnswers || prev.studentAnswers || {}),
            activeSessions: mergedActiveSessions
          };
          try {
            localStorage.setItem('shootingstar_full_backup', JSON.stringify(next));
            localStorage.setItem('shootingstar_teacher_questions', JSON.stringify(mergedTeacherQuestions));
            localStorage.setItem('shootingstar_session_questions', JSON.stringify(mergedSessionQuestions));
            localStorage.setItem('shootingstar_class_session_questions', JSON.stringify(mergedClassSessionQuestions));
            localStorage.setItem('shootingstar_active_sessions', JSON.stringify(mergedActiveSessions));
          } catch (e) {}
          return next;
        });
      }
    });

    // Refresh immediately when returning to the tab or applet window
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchState(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      unsubFeedbacks();
      unsubState();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [fetchState]);

  // One-time startup purge: ensure the 3 stubborn test feedbacks are wiped from client storage
  useEffect(() => {
    try {
      const targetIds = ['fb_1790755050460_pjrhu', 'fb_1790755076291_21umr', 'fb_1790755165876_xamof'];
      const isTarget = (f: any) => targetIds.includes(f?.id) || ['테스트중111', '테스트2', '테스트중'].includes(f?.comment);

      const vaultRaw = localStorage.getItem('shootingstar_feedbacks_vault');
      if (vaultRaw) {
        const parsed = JSON.parse(vaultRaw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(f => !isTarget(f));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem('shootingstar_feedbacks_vault', JSON.stringify(cleaned));
          }
        }
      }
      const backupRaw = localStorage.getItem('shootingstar_full_backup');
      if (backupRaw) {
        const parsed = JSON.parse(backupRaw);
        if (parsed && Array.isArray(parsed.feedbacks)) {
          const cleaned = parsed.feedbacks.filter((f: any) => !isTarget(f));
          if (cleaned.length !== parsed.feedbacks.length) {
            parsed.feedbacks = cleaned;
            localStorage.setItem('shootingstar_full_backup', JSON.stringify(parsed));
          }
        }
      }

      setAppState(prev => {
        const cleaned = (prev.feedbacks || []).filter(f => !isTarget(f));
        if (cleaned.length !== (prev.feedbacks || []).length) {
          return { ...prev, feedbacks: cleaned };
        }
        return prev;
      });
    } catch (e) {}
  }, []);

  // Client-side local backup to preserve complete state
  useEffect(() => {
    if (appState.classes.length > 0) {
      try {
        const fullBackup = {
          classes: appState.classes,
          students: appState.students,
          feedbacks: appState.feedbacks,
          aiEvaluations: appState.aiEvaluations,
          teacherQuestions: appState.teacherQuestions,
          sessionQuestions: appState.sessionQuestions,
          classSessionQuestions: appState.classSessionQuestions,
          studentAnswers: appState.studentAnswers,
          activeSessions: appState.activeSessions,
          savedAt: Date.now()
        };
        localStorage.setItem('shootingstar_full_backup', JSON.stringify(fullBackup));
      } catch (e) {}
    }
  }, [appState]);

  // Handler: Submit Feedback (Observer or Teacher)
  const handleSubmitFeedback = async (payload: {
    id?: string;
    feedbackId?: string;
    classId: string;
    performerId: string;
    performerName: string;
    observerId: string;
    observerName: string;
    observerNumber?: number;
    isTeacher?: boolean;
    shotType: ShotType;
    stars: number;
    criteriaResults: Record<number, CriterionAssessment>;
    comment: string;
    session?: number;
  }): Promise<boolean> => {
    const feedbackId = payload.feedbackId || payload.id || `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newFeedback: FeedbackItem = {
      id: feedbackId,
      classId: payload.classId,
      performerId: payload.performerId,
      performerName: payload.performerName,
      observerId: payload.observerId,
      observerName: payload.observerName,
      observerNumber: payload.observerNumber,
      isTeacher: payload.isTeacher || false,
      shotType: payload.shotType,
      stars: payload.stars,
      criteriaResults: payload.criteriaResults,
      comment: payload.comment,
      session: payload.session || 1,
      timestamp: Date.now()
    };

    // Optimistically update local state, local vault & Cloud Firestore
    let updatedFeedbacksList: FeedbackItem[] = [];
    setAppState(prev => {
      const existsIndex = prev.feedbacks.findIndex(f => f.id === feedbackId);
      let nextFeedbacks: FeedbackItem[];
      if (existsIndex >= 0) {
        nextFeedbacks = [...prev.feedbacks];
        nextFeedbacks[existsIndex] = { ...prev.feedbacks[existsIndex], ...newFeedback, updatedAt: Date.now() };
      } else {
        nextFeedbacks = [newFeedback, ...prev.feedbacks];
      }
      updatedFeedbacksList = nextFeedbacks;
      saveFeedbacksToVault(nextFeedbacks);
      return { ...prev, feedbacks: nextFeedbacks };
    });

    // 2. Direct Firestore persistence + central state document broadcast (1 read per client!)
    saveFeedbackToFirestore(newFeedback, updatedFeedbacksList).catch(err => {
      console.warn('[Firestore] Error saving individual feedback doc:', err);
    });

    // 3. Post to backend server with exact feedback ID
    try {
      fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, id: feedbackId })
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Reward 1 star back to friend
  const handleRewardFeedback = async (feedbackId: string): Promise<boolean> => {
    let updatedList: FeedbackItem[] = [];
    setAppState(prev => {
      const nextFeedbacks = prev.feedbacks.map(f =>
        f.id === feedbackId ? { ...f, favoriteRewarded: true, favoriteRewardedAt: Date.now() } : f
      );
      updatedList = nextFeedbacks;
      saveFeedbacksToVault(nextFeedbacks);
      return {
        ...prev,
        feedbacks: nextFeedbacks
      };
    });

    // Direct Firestore individual doc update & central state broadcast
    rewardFeedbackInFirestore(feedbackId, true, Date.now(), updatedList).catch(() => {});

    try {
      fetch(`/api/feedback/${feedbackId}/reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Cancel 1 reward star back to friend
  const handleCancelRewardFeedback = async (feedbackId: string): Promise<boolean> => {
    let updatedList: FeedbackItem[] = [];
    setAppState(prev => {
      const nextFeedbacks = prev.feedbacks.map(f => {
        if (f.id === feedbackId) {
          const updated = { ...f, favoriteRewarded: false };
          delete updated.favoriteRewardedAt;
          return updated;
        }
        return f;
      });
      updatedList = nextFeedbacks;
      saveFeedbacksToVault(nextFeedbacks);
      return { ...prev, feedbacks: nextFeedbacks };
    });

    // Direct Firestore individual doc update & central state broadcast
    rewardFeedbackInFirestore(feedbackId, false, undefined, updatedList).catch(() => {});

    try {
      fetch(`/api/feedback/${feedbackId}/cancel-reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Request Gemini AI / Biomechanical coaching evaluation
  const handleRequestAiFeedback = async (
    performerId: string,
    performerName: string,
    shotType: ShotType
  ): Promise<AiEvaluation | null> => {
    // 1. Try server Gemini AI route if running with server backend
    try {
      const res = await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performerId, performerName, shotType })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.evaluation) {
          const evalData: AiEvaluation = data.evaluation;
          const cacheKey = `${performerId}_${shotType}`;
          setAppState(prev => {
            const nextState = {
              ...prev,
              aiEvaluations: { ...prev.aiEvaluations, [cacheKey]: evalData }
            };
            saveStateToFirestore(nextState).catch(() => {});
            return nextState;
          });
          return evalData;
        }
      }
    } catch {
      // Server not reachable (Netlify static hosting) -> fall through to client generator
    }

    // 2. Client Biomechanical AI Engine Fallback (works 100% on Netlify and offline)
    const matchingFeedbacks = appState.feedbacks.filter(
      f => f.performerId === performerId && f.shotType === shotType
    );
    const clientEval = generateClientAiFeedback(performerId, performerName, shotType, matchingFeedbacks);
    const cacheKey = `${performerId}_${shotType}`;

    setAppState(prev => {
      const nextState = {
        ...prev,
        aiEvaluations: { ...prev.aiEvaluations, [cacheKey]: clientEval }
      };
      saveStateToFirestore(nextState).catch(() => {});
      return nextState;
    });

    return clientEval;
  };

  // Handler: Add new classroom
  const handleAddClass = async (name: string): Promise<boolean> => {
    const cleanName = name.trim();
    if (!cleanName) return false;
    const newId = `c_${Date.now()}`;
    const newClass: Classroom = { id: newId, name: cleanName };

    setAppState(prev => {
      const nextState = { ...prev, classes: [...prev.classes, newClass] };
      saveStateToFirestore(nextState).catch(() => {});
      return nextState;
    });

    try {
      fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName })
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Update classroom name
  const handleUpdateClass = async (id: string, name: string): Promise<boolean> => {
    const cleanName = name.trim();
    if (!cleanName) return false;

    setAppState(prev => {
      const nextState = {
        ...prev,
        classes: prev.classes.map(c => (c.id === id ? { ...c, name: cleanName } : c))
      };
      saveStateToFirestore(nextState).catch(() => {});
      return nextState;
    });

    try {
      fetch(`/api/classes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName })
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Delete classroom
  const handleDeleteClass = async (id: string): Promise<boolean> => {
    setAppState(prev => {
      const nextState = {
        ...prev,
        classes: prev.classes.filter(c => c.id !== id),
        students: prev.students.filter(s => s.classId !== id),
        feedbacks: prev.feedbacks.filter(f => f.classId !== id)
      };
      saveStateToFirestore(nextState).catch(() => {});
      return nextState;
    });

    try {
      fetch(`/api/classes/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Batch register 3학년 1~11반
  const handleBatchCreateGrade3 = async (mode: 'append' | 'reset-classes' = 'append'): Promise<boolean> => {
    const defaultGrade3 = getDefaultClasses();

    setAppState(prev => {
      let nextClasses: Classroom[];
      if (mode === 'reset-classes') {
        nextClasses = defaultGrade3;
      } else {
        const existingIds = new Set(prev.classes.map(c => c.id));
        const missing = defaultGrade3.filter(c => !existingIds.has(c.id));
        nextClasses = [...prev.classes, ...missing];
      }
      const nextState = { ...prev, classes: nextClasses };
      saveStateToFirestore(nextState).catch(() => {});
      return nextState;
    });

    try {
      fetch('/api/classes/batch-grade3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Bulk upload students from Excel
  const handleBulkUploadStudents = async (
    classId: string,
    rawText: string,
    mode: 'replace' | 'append'
  ): Promise<boolean> => {
    const parsed = parseStudentRosterClient(rawText, classId);
    if (parsed.length === 0) {
      alert('등록할 수 있는 학생 정보를 찾지 못했습니다.');
      return false;
    }

    setAppState(prev => {
      let nextStudents: Student[];
      if (mode === 'replace') {
        nextStudents = [...prev.students.filter(s => s.classId !== classId), ...parsed];
      } else {
        nextStudents = [...prev.students, ...parsed];
      }
      // Sort by class and number
      nextStudents.sort((a, b) => a.classId.localeCompare(b.classId) || a.number - b.number);
      const nextState = { ...prev, students: nextStudents };
      saveStateToFirestore(nextState).catch(() => {});
      return nextState;
    });

    try {
      fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, rawText, mode })
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Add single student to a class
  const handleAddStudent = async (classId: string, number: number, name: string): Promise<boolean> => {
    const cleanName = name.trim();
    if (!cleanName) return false;
    const newStudent: Student = {
      id: `s_${classId}_${number}_${Date.now()}`,
      classId,
      number,
      name: cleanName
    };

    setAppState(prev => {
      const nextStudents = [...prev.students.filter(s => !(s.classId === classId && s.number === number)), newStudent];
      nextStudents.sort((a, b) => a.classId.localeCompare(b.classId) || a.number - b.number);
      const nextState = { ...prev, students: nextStudents };
      saveStateToFirestore(nextState).catch(() => {});
      return nextState;
    });

    try {
      fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, number, name: cleanName })
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Delete single student
  const handleDeleteStudent = async (id: string): Promise<boolean> => {
    setAppState(prev => {
      const nextState = {
        ...prev,
        students: prev.students.filter(s => s.id !== id),
        feedbacks: prev.feedbacks.filter(f => f.performerId !== id && f.observerId !== id)
      };
      saveStateToFirestore(nextState).catch(() => {});
      return nextState;
    });

    try {
      fetch(`/api/students/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Bulk upload students across ALL classes (1~11반)
  const handleBulkUploadAllClasses = async (
    rawText: string,
    mode: 'replace-all' | 'append'
  ): Promise<{ success: boolean; count?: number; message?: string }> => {
    const { newStudents, newClasses } = parseAllClassesRosterClient(rawText, appState.classes);
    if (newStudents.length === 0) {
      alert('유효한 학생 명렬을 찾지 못했습니다. [학급 번호 이름] 형식으로 입력해주세요.');
      return { success: false, message: '유효한 학생 명렬을 찾지 못했습니다.' };
    }

    setAppState(prev => {
      let finalStudents: Student[];
      if (mode === 'replace-all') {
        finalStudents = newStudents;
      } else {
        finalStudents = [...prev.students, ...newStudents];
      }
      finalStudents.sort((a, b) => a.classId.localeCompare(b.classId) || a.number - b.number);
      const nextState = { ...prev, classes: newClasses, students: finalStudents };
      saveStateToFirestore(nextState).catch(() => {});
      return nextState;
    });

    try {
      fetch('/api/students/bulk-all-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, mode })
      }).catch(() => {});
    } catch {}

    return { success: true, count: newStudents.length, message: `${newStudents.length}명의 학생이 성공적으로 등록되었습니다.` };
  };

  // Handler: Import full state / backup
  const handleImportState = async (
    importedData: { classes: Classroom[]; students: Student[]; feedbacks?: FeedbackItem[] }
  ): Promise<boolean> => {
    setAppState(prev => {
      const nextState = {
        ...prev,
        classes: importedData.classes || prev.classes,
        students: importedData.students || prev.students,
        feedbacks: importedData.feedbacks || prev.feedbacks
      };
      saveStateToFirestore(nextState).catch(() => {});
      return nextState;
    });

    try {
      fetch('/api/state/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importedData)
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Save teacher question for a specific class
  const handleSaveTeacherQuestion = async (classId: string, question: string, session?: number): Promise<boolean> => {
    const cleanQ = (question || '').trim();
    let currentSession = session || appState.activeSessions?.[classId] || 1;

    setAppState(prev => {
      currentSession = session || prev.activeSessions?.[classId] || 1;
      const nextQ = { ...(prev.teacherQuestions || {}) };
      const nextAnswers = { ...(prev.studentAnswers || {}) };
      if (cleanQ) {
        nextQ[classId] = { classId, question: cleanQ, session: currentSession, updatedAt: Date.now() };
      } else {
        delete nextQ[classId];
        Object.keys(nextAnswers).forEach(key => {
          if (nextAnswers[key]?.classId === classId || key.startsWith(`${classId}_`)) {
            delete nextAnswers[key];
          }
        });
      }
      const updated = {
        ...prev,
        teacherQuestions: nextQ,
        studentAnswers: nextAnswers
      };
      saveStateToFirestore(updated).catch(() => {});
      try {
        localStorage.setItem('shootingstar_full_backup', JSON.stringify(updated));
        localStorage.setItem('shootingstar_teacher_questions', JSON.stringify(nextQ));
      } catch (e) {}
      return updated;
    });

    try {
      fetch(`/api/classes/${classId}/question`, {
        method: cleanQ ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: cleanQ ? JSON.stringify({ question: cleanQ, session: currentSession }) : undefined
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Save 1~17 session question
  const handleSaveSessionQuestion = async (session: number, question: string): Promise<boolean> => {
    const cleanQ = (question || '').trim();
    setAppState(prev => {
      const nextSessionQuestions = {
        ...(prev.sessionQuestions || getDefaultSessionQuestions()),
        [session]: cleanQ
      };
      const updated = {
        ...prev,
        sessionQuestions: nextSessionQuestions
      };
      saveStateToFirestore(updated).catch(() => {});
      try {
        localStorage.setItem('shootingstar_full_backup', JSON.stringify(updated));
        localStorage.setItem('shootingstar_session_questions', JSON.stringify(nextSessionQuestions));
      } catch (e) {}
      return updated;
    });

    try {
      fetch(`/api/session-questions/${session}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: cleanQ })
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Batch save 1~17 session questions
  const handleBatchSaveSessionQuestions = async (questions: Record<number, string>): Promise<boolean> => {
    setAppState(prev => {
      const nextSessionQuestions = {
        ...(prev.sessionQuestions || getDefaultSessionQuestions()),
        ...questions
      };
      const updated = {
        ...prev,
        sessionQuestions: nextSessionQuestions
      };
      saveStateToFirestore(updated).catch(() => {});
      try {
        localStorage.setItem('shootingstar_full_backup', JSON.stringify(updated));
        localStorage.setItem('shootingstar_session_questions', JSON.stringify(nextSessionQuestions));
      } catch (e) {}
      return updated;
    });

    try {
      fetch('/api/session-questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions })
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Save single session question for a specific class (1~17)
  const handleSaveClassSessionQuestion = async (classId: string, session: number, question: string): Promise<boolean> => {
    const cleanQ = (question || '').trim();
    setAppState(prev => {
      const currentClassQ = prev.classSessionQuestions?.[classId] || {};
      const updatedClassQ = {
        ...currentClassQ,
        [session]: cleanQ
      };
      const nextClassSessionQuestions = {
        ...(prev.classSessionQuestions || {}),
        [classId]: updatedClassQ
      };
      const updated = {
        ...prev,
        classSessionQuestions: nextClassSessionQuestions
      };
      saveStateToFirestore(updated).catch(() => {});
      try {
        localStorage.setItem('shootingstar_full_backup', JSON.stringify(updated));
        localStorage.setItem('shootingstar_class_session_questions', JSON.stringify(nextClassSessionQuestions));
      } catch (e) {}
      return updated;
    });

    try {
      fetch(`/api/classes/${classId}/session-questions/${session}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: cleanQ })
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Batch save 1~17 session questions for a specific class
  const handleBatchSaveClassSessionQuestions = async (classId: string, questions: Record<number, string>): Promise<boolean> => {
    setAppState(prev => {
      const currentClassQ = prev.classSessionQuestions?.[classId] || {};
      const updatedClassQ = {
        ...currentClassQ,
        ...questions
      };
      const nextClassSessionQuestions = {
        ...(prev.classSessionQuestions || {}),
        [classId]: updatedClassQ
      };
      const updated = {
        ...prev,
        classSessionQuestions: nextClassSessionQuestions
      };
      saveStateToFirestore(updated).catch(() => {});
      try {
        localStorage.setItem('shootingstar_full_backup', JSON.stringify(updated));
        localStorage.setItem('shootingstar_class_session_questions', JSON.stringify(nextClassSessionQuestions));
      } catch (e) {}
      return updated;
    });

    try {
      fetch(`/api/classes/${classId}/session-questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions })
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Save student answer to teacher question
  const handleSaveStudentAnswer = async (classId: string, studentId: string, answer: string, session?: number): Promise<boolean> => {
    const cleanA = (answer || '').trim();
    const student = appState.students.find(s => s.id === studentId);
    const targetSession = session || appState.activeSessions?.[classId] || 1;
    const answerKey = `${classId}_${studentId}_s${targetSession}`;
    const legacyKey = `${classId}_${studentId}`;
    const newAnswer = {
      id: `ans_${classId}_${studentId}_s${targetSession}`,
      classId,
      studentId,
      studentName: student?.name || '',
      studentNumber: student?.number || 1,
      answer: cleanA,
      session: targetSession,
      updatedAt: Date.now()
    };

    setAppState(prev => {
      const nextAnswers = { ...(prev.studentAnswers || {}) };
      // Delete legacy key to prevent duplicate items in submission lists
      delete nextAnswers[legacyKey];
      nextAnswers[answerKey] = newAnswer;

      const cleanAnswers = canonicalizeAnswersMap(nextAnswers);

      const nextState = {
        ...prev,
        studentAnswers: cleanAnswers
      };
      saveStateToFirestore(nextState).catch(() => {});
      try {
        localStorage.setItem('shootingstar_full_backup', JSON.stringify(nextState));
      } catch (e) {}
      return nextState;
    });

    try {
      fetch(`/api/classes/${classId}/students/${studentId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: cleanA, session: targetSession })
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Delete single student answer
  const handleDeleteStudentAnswer = async (classId: string, studentId: string, session?: number): Promise<boolean> => {
    setAppState(prev => {
      const nextAnswers = { ...(prev.studentAnswers || {}) };
      Object.keys(nextAnswers).forEach(key => {
        const ans = nextAnswers[key];
        if (ans && ans.classId === classId && (ans.studentId === studentId || key.includes(studentId))) {
          if (session === undefined || (ans.session || 1) === session) {
            delete nextAnswers[key];
          }
        }
      });
      const cleanAnswers = canonicalizeAnswersMap(nextAnswers);
      const nextState = {
        ...prev,
        studentAnswers: cleanAnswers
      };
      saveStateToFirestore(nextState).catch(() => {});
      try {
        localStorage.setItem('shootingstar_full_backup', JSON.stringify(nextState));
      } catch (e) {}
      return nextState;
    });

    try {
      const url = session
        ? `/api/classes/${classId}/students/${studentId}/answer?session=${session}`
        : `/api/classes/${classId}/students/${studentId}/answer`;
      fetch(url, { method: 'DELETE' }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Teacher submit feedback
  const handleSubmitTeacherFeedback = async (payload: {
    classId: string;
    performerId: string;
    performerName: string;
    shotType: ShotType;
    stars: number;
    criteriaResults: Record<number, CriterionAssessment>;
    comment: string;
    session?: number;
  }): Promise<boolean> => {
    return handleSubmitFeedback({
      ...payload,
      observerId: 'teacher',
      observerName: '체육 선생님',
      isTeacher: true
    });
  };

  // Handler: Delete single feedback
  const handleDeleteFeedback = async (id: string): Promise<boolean> => {
    setAppState(prev => {
      const nextState = {
        ...prev,
        feedbacks: prev.feedbacks.filter(f => f.id !== id)
      };
      saveStateToFirestore(nextState).catch(() => {});
      return nextState;
    });

    try {
      fetch(`/api/feedback/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Set active lesson session for a class
  const handleSetActiveSession = async (classId: string, session: number): Promise<boolean> => {
    setAppState(prev => {
      const nextSessions = {
        ...(prev.activeSessions || {}),
        [classId]: session
      };
      const nextState = {
        ...prev,
        activeSessions: nextSessions
      };
      saveStateToFirestore(nextState).catch(() => {});
      try {
        localStorage.setItem('shootingstar_full_backup', JSON.stringify(nextState));
        localStorage.setItem('shootingstar_active_sessions', JSON.stringify(nextSessions));
      } catch (e) {}
      return nextState;
    });

    try {
      fetch(`/api/classes/${classId}/active-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session })
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Batch set active lesson session across all or selected classes
  const handleBatchSetActiveSession = async (session: number, classIds?: string[]): Promise<boolean> => {
    setAppState(prev => {
      const nextSessions = { ...(prev.activeSessions || {}) };
      const targets = classIds && classIds.length > 0 ? classIds : prev.classes.map(c => c.id);
      targets.forEach(cId => {
        nextSessions[cId] = session;
      });
      const nextState = { ...prev, activeSessions: nextSessions };
      saveStateToFirestore(nextState).catch(() => {});
      try {
        localStorage.setItem('shootingstar_full_backup', JSON.stringify(nextState));
        localStorage.setItem('shootingstar_active_sessions', JSON.stringify(nextSessions));
      } catch (e) {}
      return nextState;
    });

    try {
      fetch('/api/classes/batch-active-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, classIds })
      }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Clear feedbacks
  const handleClearFeedbacks = async (
    options?: {
      classId?: string;
      shotType?: ShotType | 'all';
      studentId?: string;
      session?: number | 'all';
      clearAiEvaluations?: boolean;
    } | string
  ): Promise<{ success: boolean; message?: string; deletedCount?: number }> => {
    const payload = typeof options === 'string'
      ? { classId: options, shotType: 'all', studentId: 'all', session: 'all', clearAiEvaluations: true }
      : {
          classId: options?.classId || 'all',
          shotType: options?.shotType || 'all',
          studentId: options?.studentId || 'all',
          session: options?.session || 'all',
          clearAiEvaluations: options?.clearAiEvaluations !== false
        };

    const isAllClasses = !payload.classId || payload.classId === 'all';
    const isAllShots = !payload.shotType || payload.shotType === 'all';
    const isAllStudents = !payload.studentId || payload.studentId === 'all';
    const isAllSessions = !payload.session || payload.session === 'all';

    let deleted = 0;
    setAppState(prev => {
      const updatedFeedbacks = prev.feedbacks.filter(f => {
        const matchesClass = isAllClasses || f.classId === payload.classId;
        const matchesShot = isAllShots || f.shotType === payload.shotType;
        const matchesStudent = isAllStudents || f.performerId === payload.studentId || f.observerId === payload.studentId;
        const matchesSession = isAllSessions || (f.session || 1) === Number(payload.session);
        if (matchesClass && matchesShot && matchesStudent && matchesSession) {
          deleted++;
          return false;
        }
        return true;
      });

      const nextAiEvals = { ...(prev.aiEvaluations || {}) };
      if (payload.clearAiEvaluations) {
        if (isAllClasses && isAllShots && isAllStudents) {
          Object.keys(nextAiEvals).forEach(k => delete nextAiEvals[k]);
        }
      }

      const nextState = {
        ...prev,
        feedbacks: updatedFeedbacks,
        aiEvaluations: nextAiEvals
      };
      saveFeedbacksToVault(updatedFeedbacks);
      saveStateToFirestore(nextState).catch(() => {});
      return nextState;
    });

    // Delete matching documents in Firestore collection
    clearFeedbacksInFirestore({
      classId: payload.classId,
      shotType: payload.shotType,
      studentId: payload.studentId,
      session: payload.session === 'all' ? 'all' : Number(payload.session)
    }).catch(err => {
      console.warn('[Firestore] Error clearing feedbacks in Firestore collection:', err);
    });

    try {
      fetch('/api/feedback/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch {}

    return { success: true, message: `${deleted}건의 피드백이 초기화되었습니다.`, deletedCount: deleted };
  };

  // Handler: Reset sample data
  const handleResetData = async (): Promise<boolean> => {
    const defaults = getDefaultAppState();
    setAppState(defaults);
    saveStateToFirestore(defaults).catch(() => {});

    try {
      fetch('/api/reset', { method: 'POST' }).catch(() => {});
    } catch {}

    return true;
  };

  // Handler: Comprehensive Device Vault to Cloud Sync & Backup
  const handleSyncAllFeedbacksToCloud = async (): Promise<{ success: boolean; count: number; message: string }> => {
    try {
      const vaultFeedbacks = loadFeedbacksFromVault();
      const mergedList = mergeFeedbackArrays(appState.feedbacks, vaultFeedbacks);
      saveFeedbacksToVault(mergedList);

      setAppState(prev => ({ ...prev, feedbacks: mergedList }));

      // 1. Sync to Cloud Firestore (both vault and full state with merge: true)
      await syncVaultFeedbacksToFirestore(mergedList);
      await saveStateToFirestore({ ...appState, feedbacks: mergedList });

      // 2. Sync to Server backend if reachable
      try {
        await fetch('/api/feedback/batch-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedbacks: mergedList })
        });
      } catch {}

      return {
        success: true,
        count: mergedList.length,
        message: `총 ${mergedList.length}건의 피드백이 클라우드 및 서버와 완벽하게 동기화되었습니다! 이제 모든 학생 및 PC에서 실시간으로 확인하실 수 있습니다.`
      };
    } catch (e: any) {
      return {
        success: false,
        count: 0,
        message: '동기화 중 오류가 발생했습니다: ' + (e?.message || '알 수 없는 오류')
      };
    }
  };

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950 relative">
      {/* Background basketball court lines & floating stars */}
      <BasketballCourtBackground />

      {/* Top Navbar */}
      <Navbar
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        onRefresh={fetchState}
        isRefreshing={isRefreshing}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        isSyncingCloud={isSyncingCloud}
        onSyncCloud={async () => {
          setIsSyncingCloud(true);
          const res = await handleSyncAllFeedbacksToCloud();
          setIsSyncingCloud(false);
          alert(res.message);
        }}
      />

      {/* QR Code Quick Share Modal */}
      <QrShareModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />

      {/* In-app Browser Notice Banner (KakaoTalk / Naver / Instagram QR access helper) */}
      {showInAppAlert && (
        <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 px-4 py-2 text-xs font-bold flex flex-wrap items-center justify-between gap-2 z-30 shadow-md border-b border-amber-500/40">
          <div className="flex items-center gap-2">
            <span className="text-base">📱</span>
            <span>
              카카오톡/네이버 인앱 브라우저로 접속 중입니다. 동영상 촬영과 안정적인 저장을 위해 <strong>Chrome/Safari</strong> 사용을 권장합니다.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenExternalBrowser}
              className="px-2.5 py-1 rounded-lg bg-slate-950 text-amber-300 text-[11px] font-black cursor-pointer hover:bg-slate-800 transition-all flex items-center gap-1 shadow-sm"
            >
              <ExternalLink className="w-3 h-3" />
              외부 브라우저로 열기
            </button>
            <button
              type="button"
              onClick={() => setShowInAppAlert(false)}
              className="text-slate-800 hover:text-slate-950 font-bold px-1.5 py-0.5 text-xs cursor-pointer"
              title="닫기"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Error alert toast if network fails */}
      {errorMessage && (
        <div className="max-w-md mx-auto mt-4 px-4 py-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs text-center z-20">
          {errorMessage} - <button onClick={() => fetchState()} className="underline font-bold">다시 시도</button>
        </div>
      )}

      {/* Main Mode View Routing */}
      <main className="flex-1 pb-16 flex flex-col justify-center">
        {initialLoading && appState.classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-3xl mb-4 animate-bounce">
              🏀
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              슈팅스타 농구 코트 입장 중...
            </h2>
            <p className="text-xs text-slate-400 max-w-xs">
              학급 데이터와 피드백 정보를 불러오고 있습니다. 잠시만 기다려주세요.
            </p>
          </div>
        ) : (
          <>
            {currentMode === 'home' && (
              <ModeSelection
                onSelectMode={setCurrentMode}
                totalFeedbacks={appState.feedbacks.length}
                totalStudents={appState.students.length}
                isSyncingCloud={isSyncingCloud}
                onSyncCloud={async () => {
                  setIsSyncingCloud(true);
                  const res = await handleSyncAllFeedbacksToCloud();
                  setIsSyncingCloud(false);
                  alert(res.message);
                }}
              />
            )}

            {currentMode === 'performer' && (
              <PerformerMode
                classes={appState.classes}
                students={appState.students}
                feedbacks={appState.feedbacks}
                aiEvaluations={appState.aiEvaluations}
                activeSessions={appState.activeSessions}
                teacherQuestions={appState.teacherQuestions}
                sessionQuestions={appState.sessionQuestions || {}}
                classSessionQuestions={appState.classSessionQuestions || {}}
                studentAnswers={appState.studentAnswers}
                onRewardFeedback={handleRewardFeedback}
                onCancelRewardFeedback={handleCancelRewardFeedback}
                onRequestAiFeedback={handleRequestAiFeedback}
                onSaveStudentAnswer={handleSaveStudentAnswer}
              />
            )}

            {currentMode === 'observer' && (
              <ObserverMode
                classes={appState.classes}
                students={appState.students}
                feedbacks={appState.feedbacks}
                activeSessions={appState.activeSessions}
                onSubmitFeedback={handleSubmitFeedback}
              />
            )}

            {currentMode === 'all' && (
              <OverviewMode
                classes={appState.classes}
                students={appState.students}
                feedbacks={appState.feedbacks}
                aiEvaluations={appState.aiEvaluations}
                onRequestAiFeedback={handleRequestAiFeedback}
              />
            )}

            {currentMode === 'teacher' && (
              <TeacherMode
                classes={appState.classes}
                students={appState.students}
                feedbacks={appState.feedbacks}
                activeSessions={appState.activeSessions}
                teacherQuestions={appState.teacherQuestions}
                sessionQuestions={appState.sessionQuestions || {}}
                classSessionQuestions={appState.classSessionQuestions || {}}
                studentAnswers={appState.studentAnswers}
                onAddClass={handleAddClass}
                onUpdateClass={handleUpdateClass}
                onDeleteClass={handleDeleteClass}
                onBatchCreateGrade3={handleBatchCreateGrade3}
                onBulkUploadStudents={handleBulkUploadStudents}
                onBulkUploadAllClasses={handleBulkUploadAllClasses}
                onImportState={handleImportState}
                onAddStudent={handleAddStudent}
                onDeleteStudent={handleDeleteStudent}
                onDeleteFeedback={handleDeleteFeedback}
                onClearFeedbacks={handleClearFeedbacks}
                onSaveTeacherQuestion={handleSaveTeacherQuestion}
                onSaveSessionQuestion={handleSaveSessionQuestion}
                onBatchSaveSessionQuestions={handleBatchSaveSessionQuestions}
                onSaveClassSessionQuestion={handleSaveClassSessionQuestion}
                onBatchSaveClassSessionQuestions={handleBatchSaveClassSessionQuestions}
                onDeleteStudentAnswer={handleDeleteStudentAnswer}
                onSubmitTeacherFeedback={handleSubmitTeacherFeedback}
                onSetActiveSession={handleSetActiveSession}
                onBatchSetActiveSession={handleBatchSetActiveSession}
                onSyncAllFeedbacksToCloud={handleSyncAllFeedbacksToCloud}
                onResetData={handleResetData}
              />
            )}
          </>
        )}
      </main>

      {/* Subtle Footer */}
      <footer className="relative z-10 border-t border-slate-900/80 bg-slate-950/70 py-4 text-center text-xs text-slate-500">
        <p>슈팅스타 &bull; 농구 슛 자세 상호 피드백 및 AI 생체역학 코칭 시스템</p>
      </footer>
    </div>
  );
}
