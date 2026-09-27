import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import {
  AppMode,
  AppStateData,
  Classroom,
  Student,
  FeedbackItem,
  AiEvaluation,
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
import { GameMode } from './components/GameMode';
import { saveStateToFirestore, fetchStateFromFirestore } from './lib/firebase';

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('home');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // App core state
  const [appState, setAppState] = useState<AppStateData>({
    classes: [],
    students: [],
    feedbacks: [],
    aiEvaluations: {}
  });

  // Flag to ensure auto-restore from cloud/local cache runs only once on initial boot
  const initialSyncAttemptedRef = useRef<boolean>(false);

  // Fetch state from server with automatic Cloud Firestore / Local fallback
  const fetchState = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('서버 데이터를 불러오지 못했습니다.');
      const data = await res.json();
      if (data.success && data.data) {
        const serverData = data.data;

        // If server data is still the bare default (e.g. fresh container) and this is initial boot,
        // check if Cloud Firestore or local browser backup has our actual saved roster!
        if (!initialSyncAttemptedRef.current) {
          initialSyncAttemptedRef.current = true;

          // 1. Try Cloud Firestore first
          try {
            const firestoreData = await fetchStateFromFirestore();
            if (
              firestoreData &&
              Array.isArray(firestoreData.classes) &&
              Array.isArray(firestoreData.students) &&
              firestoreData.students.length > 0
            ) {
              console.log('[ShootingStar] Restored directly from Cloud Firestore!');
              setAppState(firestoreData);
              // Push to server as well so server memory & endpoints stay synced
              fetch('/api/state/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(firestoreData)
              }).catch(() => {});
              return;
            }
          } catch (fsErr) {
            console.warn('[ShootingStar] Firestore fetch on boot:', fsErr);
          }

          // 2. Try browser local storage backup if server has default 16 students
          const isDefaultSeed =
            serverData.students.length <= 16 &&
            serverData.students.some((s: Student) => s.name === '강민준');

          if (isDefaultSeed) {
            try {
              const cachedFull = localStorage.getItem('shootingstar_full_backup');
              const cachedRoster = localStorage.getItem('shootingstar_roster_cache');
              const parsed = cachedFull ? JSON.parse(cachedFull) : (cachedRoster ? JSON.parse(cachedRoster) : null);

              if (parsed && Array.isArray(parsed.classes) && Array.isArray(parsed.students) && parsed.students.length > 0) {
                // If the cached version has more students or is custom, auto restore!
                console.log('[ShootingStar] Auto-restoring from browser backup cache to cloud & server...');
                setAppState(parsed);
                fetch('/api/state/import', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(parsed)
                }).catch(() => {});
                saveStateToFirestore(parsed).catch(() => {});
                return;
              }
            } catch (e) {
              // ignore cache parse error
            }
          }
        }

        setAppState(serverData);
      }
    } catch (err: any) {
      console.error('Failed to load state:', err);
      if (!silent) {
        setErrorMessage(err.message || '네트워크 연결 상태를 확인해주세요.');
      }
    } finally {
      if (!silent) setIsRefreshing(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();

    // Periodic auto-refresh every 5 seconds so peer feedback and stars appear near real-time across devices
    const interval = setInterval(() => {
      fetchState(true);
    }, 5000);

    // Refresh immediately when returning to the tab or applet window
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchState(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [fetchState]);

  // Handler: Submit Feedback (Observer or Teacher) - Supports create, update, and session
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
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.warn('[Feedback] 등록 실패:', data?.message);
        return false;
      }

      // Optimistically update or insert local feedbacks
      setAppState(prev => {
        const returnedFb: FeedbackItem = data.feedback;
        const existsIndex = prev.feedbacks.findIndex(f => f.id === returnedFb.id);
        let nextFeedbacks: FeedbackItem[];
        if (existsIndex >= 0) {
          nextFeedbacks = [...prev.feedbacks];
          nextFeedbacks[existsIndex] = returnedFb;
        } else {
          nextFeedbacks = [returnedFb, ...prev.feedbacks];
        }
        const nextState = {
          ...prev,
          feedbacks: nextFeedbacks
        };
        saveStateToFirestore(nextState).catch(() => {});
        return nextState;
      });
      return true;
    } catch (err: any) {
      console.error('[Feedback] 오류 발생:', err);
      return false;
    }
  };

  // Handler: Reward 1 star back to friend
  const handleRewardFeedback = async (feedbackId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || '보답 별 전달에 실패했습니다.');
        return false;
      }

      // Update local feedback
      setAppState(prev => {
        const nextState = {
          ...prev,
          feedbacks: prev.feedbacks.map(f => f.id === feedbackId ? { ...f, favoriteRewarded: true, favoriteRewardedAt: Date.now() } : f)
        };
        saveStateToFirestore(nextState).catch(() => {});
        return nextState;
      });
      return true;
    } catch (err: any) {
      alert('보답 별 전달 중 오류: ' + err.message);
      return false;
    }
  };

  // Handler: Cancel 1 reward star back to friend (보답 별 취소)
  const handleCancelRewardFeedback = async (feedbackId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/cancel-reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.warn('보답 별 취소 실패:', data.message);
        return false;
      }

      // Update local feedback
      setAppState(prev => {
        const nextFeedbacks = prev.feedbacks.map(f => {
          if (f.id === feedbackId) {
            const updated = { ...f, favoriteRewarded: false };
            delete updated.favoriteRewardedAt;
            return updated;
          }
          return f;
        });
        const nextState = {
          ...prev,
          feedbacks: nextFeedbacks
        };
        saveStateToFirestore(nextState).catch(() => {});
        return nextState;
      });
      return true;
    } catch (err: any) {
      console.warn('보답 별 취소 중 오류:', err);
      return false;
    }
  };

  // Handler: Request Gemini AI comprehensive evaluation
  const handleRequestAiFeedback = async (
    performerId: string,
    performerName: string,
    shotType: ShotType
  ): Promise<AiEvaluation | null> => {
    try {
      const res = await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          performerId,
          performerName,
          shotType
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.warn('[AI Feedback] 요청 실패:', data?.message);
        return null;
      }

      const evalData: AiEvaluation = data.evaluation;
      const cacheKey = `${performerId}_${shotType}`;

      setAppState(prev => {
        const nextState = {
          ...prev,
          aiEvaluations: {
            ...prev.aiEvaluations,
            [cacheKey]: evalData
          }
        };
        saveStateToFirestore(nextState).catch(() => {});
        return nextState;
      });

      return evalData;
    } catch (err: any) {
      console.error('[AI Feedback] 생성 오류:', err);
      return null;
    }
  };

  // Handler: Add new classroom
  const handleAddClass = async (name: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || '학급 추가에 실패했습니다.');
        return false;
      }

      setAppState(prev => ({
        ...prev,
        classes: [...prev.classes, data.classroom]
      }));
      return true;
    } catch (err: any) {
      alert('학급 추가 실패: ' + err.message);
      return false;
    }
  };

  // Handler: Update classroom name
  const handleUpdateClass = async (id: string, name: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/classes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || '학급 수정에 실패했습니다.');
        return false;
      }

      setAppState(prev => ({
        ...prev,
        classes: prev.classes.map(c => (c.id === id ? data.classroom : c))
      }));
      return true;
    } catch (err: any) {
      alert('학급 수정 실패: ' + err.message);
      return false;
    }
  };

  // Handler: Delete classroom
  const handleDeleteClass = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/classes/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || '학급 삭제에 실패했습니다.');
        return false;
      }

      // Refresh or filter out deleted class, its students, and its feedbacks
      setAppState(prev => ({
        ...prev,
        classes: prev.classes.filter(c => c.id !== id),
        students: prev.students.filter(s => s.classId !== id),
        feedbacks: prev.feedbacks.filter(f => f.classId !== id)
      }));
      return true;
    } catch (err: any) {
      alert('학급 삭제 실패: ' + err.message);
      return false;
    }
  };

  // Handler: Batch register 3학년 1~11반
  const handleBatchCreateGrade3 = async (mode: 'append' | 'reset-classes' = 'append'): Promise<boolean> => {
    try {
      const res = await fetch('/api/classes/batch-grade3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || '3학년 1~11반 일괄 등록에 실패했습니다.');
        return false;
      }

      await fetchState();
      return true;
    } catch (err: any) {
      alert('3학년 1~11반 일괄 등록 실패: ' + err.message);
      return false;
    }
  };

  // Handler: Bulk upload students from Excel
  const handleBulkUploadStudents = async (
    classId: string,
    rawText: string,
    mode: 'replace' | 'append'
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, rawText, mode })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || '명렬표 등록에 실패했습니다.');
        return false;
      }

      await fetchState();
      return true;
    } catch (err: any) {
      alert('명렬표 등록 실패: ' + err.message);
      return false;
    }
  };

  // Handler: Add single student to a class
  const handleAddStudent = async (classId: string, number: number, name: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, number, name })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || '학생 등록에 실패했습니다.');
        return false;
      }
      await fetchState();
      return true;
    } catch (err: any) {
      alert('학생 등록 실패: ' + err.message);
      return false;
    }
  };

  // Handler: Delete single student
  const handleDeleteStudent = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || '학생 삭제에 실패했습니다.');
        return false;
      }
      setAppState(prev => ({
        ...prev,
        students: prev.students.filter(s => s.id !== id)
      }));
      return true;
    } catch (err: any) {
      alert('학생 삭제 실패: ' + err.message);
      return false;
    }
  };

  // Handler: Bulk upload students across ALL classes (1~11반)
  const handleBulkUploadAllClasses = async (
    rawText: string,
    mode: 'replace-all' | 'append'
  ): Promise<{ success: boolean; count?: number; message?: string }> => {
    try {
      const res = await fetch('/api/students/bulk-all-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, mode })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || '전체 학급 명렬 일괄 등록에 실패했습니다.');
        return { success: false, message: data.message };
      }

      await fetchState();
      return { success: true, count: data.addedCount, message: data.message };
    } catch (err: any) {
      alert('전체 학급 명렬 등록 실패: ' + err.message);
      return { success: false, message: err.message };
    }
  };

  // Handler: Import full state / backup
  const handleImportState = async (
    importedData: { classes: Classroom[]; students: Student[]; feedbacks?: FeedbackItem[] }
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/state/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importedData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || '데이터 복원에 실패했습니다.');
        return false;
      }
      // Save directly to Cloud Firestore as well
      saveStateToFirestore(importedData).catch(() => {});
      await fetchState();
      return true;
    } catch (err: any) {
      alert('데이터 복원 실패: ' + err.message);
      return false;
    }
  };

  // Client-side local backup to preserve complete state (roster + feedbacks + stars) even across network or container incidents
  useEffect(() => {
    if (appState.students.length > 0 || appState.feedbacks.length > 0) {
      try {
        const fullBackup = {
          classes: appState.classes,
          students: appState.students,
          feedbacks: appState.feedbacks,
          aiEvaluations: appState.aiEvaluations,
          teacherQuestions: appState.teacherQuestions,
          studentAnswers: appState.studentAnswers,
          activeSessions: appState.activeSessions,
          savedAt: Date.now()
        };
        localStorage.setItem('shootingstar_full_backup', JSON.stringify(fullBackup));

        // Also keep roster cache for compatibility
        localStorage.setItem('shootingstar_roster_cache', JSON.stringify({
          classes: appState.classes,
          students: appState.students,
          savedAt: Date.now()
        }));

        // Keep Cloud Firestore in sync
        saveStateToFirestore(fullBackup).catch(() => {});
      } catch (e) {
        // ignore storage quota errors
      }
    }
  }, [appState.classes, appState.students, appState.feedbacks, appState.aiEvaluations, appState.teacherQuestions, appState.studentAnswers, appState.activeSessions]);

  // Handler: Save or reset teacher question for a specific class
  const handleSaveTeacherQuestion = async (classId: string, question: string): Promise<boolean> => {
    try {
      const cleanQ = (question || '').trim();
      const res = await fetch(`/api/classes/${classId}/question`, {
        method: cleanQ ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: cleanQ ? JSON.stringify({ question: cleanQ }) : undefined
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error('Failed to process question:', data.message);
        return false;
      }
      setAppState(prev => {
        const nextQ = { ...(prev.teacherQuestions || {}) };
        const nextAnswers = { ...(prev.studentAnswers || {}) };
        if (cleanQ) {
          nextQ[classId] = data.data;
        } else {
          delete nextQ[classId];
          // Also clear student answers for this class
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
        // Update browser cache immediately
        try {
          const fullBackup = {
            classes: updated.classes,
            students: updated.students,
            feedbacks: updated.feedbacks,
            aiEvaluations: updated.aiEvaluations,
            teacherQuestions: updated.teacherQuestions,
            studentAnswers: updated.studentAnswers,
            activeSessions: updated.activeSessions,
            savedAt: Date.now()
          };
          localStorage.setItem('shootingstar_full_backup', JSON.stringify(fullBackup));
          saveStateToFirestore(fullBackup).catch(() => {});
        } catch (e) {}

        return updated;
      });
      // Synchronize with server
      await fetchState(true);
      return true;
    } catch (err: any) {
      console.error('Error in handleSaveTeacherQuestion:', err);
      return false;
    }
  };

  // Handler: Save student answer to teacher question
  const handleSaveStudentAnswer = async (classId: string, studentId: string, answer: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/classes/${classId}/students/${studentId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || '답변 저장에 실패했습니다.');
        return false;
      }
      const answerKey = `${classId}_${studentId}`;
      setAppState(prev => ({
        ...prev,
        studentAnswers: {
          ...(prev.studentAnswers || {}),
          [answerKey]: data.data
        }
      }));
      return true;
    } catch (err: any) {
      alert('답변 저장 중 오류: ' + err.message);
      return false;
    }
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
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || '피드백 삭제에 실패했습니다.');
        return false;
      }
      setAppState(prev => ({
        ...prev,
        feedbacks: prev.feedbacks.filter(f => f.id !== id)
      }));
      return true;
    } catch (err: any) {
      alert('피드백 삭제 중 오류: ' + err.message);
      return false;
    }
  };

  // Handler: Set active lesson session for a class
  const handleSetActiveSession = async (classId: string, session: number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/classes/${classId}/active-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return false;
      }
      setAppState(prev => {
        const next = {
          ...prev,
          activeSessions: {
            ...(prev.activeSessions || {}),
            [classId]: session
          }
        };
        saveStateToFirestore(next).catch(() => {});
        return next;
      });
      return true;
    } catch {
      return false;
    }
  };

  // Handler: Batch set active lesson session across all or selected classes
  const handleBatchSetActiveSession = async (session: number, classIds?: string[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/classes/batch-active-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, classIds })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        // Fallback to per-class
        const targets = classIds && classIds.length > 0 ? classIds : appState.classes.map(c => c.id);
        await Promise.all(targets.map(cId => handleSetActiveSession(cId, session)));
        return true;
      }
      setAppState(prev => {
        const nextSessions = { ...(prev.activeSessions || {}) };
        const targets = classIds && classIds.length > 0 ? classIds : prev.classes.map(c => c.id);
        targets.forEach(cId => {
          nextSessions[cId] = session;
        });
        const next = { ...prev, activeSessions: nextSessions };
        saveStateToFirestore(next).catch(() => {});
        return next;
      });
      return true;
    } catch {
      const targets = classIds && classIds.length > 0 ? classIds : appState.classes.map(c => c.id);
      await Promise.all(targets.map(cId => handleSetActiveSession(cId, session)));
      return true;
    }
  };

  // Handler: Clear feedbacks (granular: by class, shotType, studentId, session)
  const handleClearFeedbacks = async (
    options?: {
      classId?: string;
      shotType?: ShotType | 'all';
      studentId?: string;
      session?: number | 'all';
      clearAiEvaluations?: boolean;
    } | string
  ): Promise<{ success: boolean; message?: string; deletedCount?: number }> => {
    try {
      const payload = typeof options === 'string'
        ? { classId: options, shotType: 'all', studentId: 'all', session: 'all', clearAiEvaluations: true }
        : {
            classId: options?.classId || 'all',
            shotType: options?.shotType || 'all',
            studentId: options?.studentId || 'all',
            session: options?.session || 'all',
            clearAiEvaluations: options?.clearAiEvaluations !== false
          };

      const res = await fetch('/api/feedback/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.message || '피드백 초기화에 실패했습니다.' };
      }

      setAppState(prev => {
        const isAllClasses = !payload.classId || payload.classId === 'all';
        const isAllShots = !payload.shotType || payload.shotType === 'all';
        const isAllStudents = !payload.studentId || payload.studentId === 'all';
        const isAllSessions = !payload.session || payload.session === 'all';

        const updatedFeedbacks = prev.feedbacks.filter(f => {
          if (!isAllClasses && f.classId !== payload.classId) return true;
          if (!isAllShots && f.shotType !== payload.shotType) return true;
          if (!isAllStudents && f.performerId !== payload.studentId && f.observerId !== payload.studentId) return true;
          if (!isAllSessions && (f.session || 1) !== Number(payload.session)) return true;
          return false;
        });

        // Prune matching AI evaluation cache
        const nextAiEvals = { ...(prev.aiEvaluations || {}) };
        if (payload.clearAiEvaluations) {
          if (isAllClasses && isAllShots && isAllStudents) {
            Object.keys(nextAiEvals).forEach(k => delete nextAiEvals[k]);
          } else {
            Object.keys(nextAiEvals).forEach(cacheKey => {
              const [pId, sType] = cacheKey.split('_');
              const matchesClass = isAllClasses || (prev.students.find(s => s.id === pId)?.classId === payload.classId);
              const matchesShot = isAllShots || sType === payload.shotType;
              const matchesStudent = isAllStudents || pId === payload.studentId;
              if (matchesClass && matchesShot && matchesStudent) {
                delete nextAiEvals[cacheKey];
              }
            });
          }
        }

        const nextState = {
          ...prev,
          feedbacks: updatedFeedbacks,
          aiEvaluations: nextAiEvals
        };

        try {
          const fullBackup = {
            classes: nextState.classes,
            students: nextState.students,
            feedbacks: nextState.feedbacks,
            aiEvaluations: nextState.aiEvaluations,
            teacherQuestions: nextState.teacherQuestions,
            studentAnswers: nextState.studentAnswers,
            savedAt: Date.now()
          };
          localStorage.setItem('shootingstar_full_backup', JSON.stringify(fullBackup));
          saveStateToFirestore(fullBackup).catch(() => {});
        } catch (e) {}

        return nextState;
      });

      await fetchState(true);
      return { success: true, message: data.message, deletedCount: data.deletedCount };
    } catch (err: any) {
      return { success: false, message: err.message || '피드백 초기화 중 오류가 발생했습니다.' };
    }
  };

  // Handler: Reset sample data
  const handleResetData = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchState();
        return true;
      }
      return false;
    } catch (err: any) {
      alert('초기화 실패: ' + err.message);
      return false;
    }
  };

  // Handler: Save game score (별빛 버저비터 게임 모드)
  const handleSaveGameScore = async (payload: {
    studentId?: string;
    studentName: string;
    studentNumber?: number;
    classId?: string;
    className?: string;
    score: number;
    totalShots: number;
    madeShots: number;
    perfectCount: number;
    maxCombo: number;
    shotTypesBreakdown?: {
      middleMade: number;
      middleTotal: number;
      layupMade: number;
      layupTotal: number;
    };
  }) => {
    try {
      const res = await fetch('/api/game/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.item) {
        setAppState(prev => {
          const nextScores = [...(prev.gameScores || []), data.item];
          const nextState = { ...prev, gameScores: nextScores };
          saveStateToFirestore(nextState).catch(() => {});
          return nextState;
        });
        return data;
      }
    } catch (err) {
      console.error('Failed to save game score:', err);
    }
    return null;
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
      />

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
        ) : errorMessage && appState.classes.length === 0 ? (
          <div className="max-w-sm mx-auto my-16 p-6 rounded-2xl bg-slate-900/90 border border-rose-500/30 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">데이터 연결이 지연되고 있습니다</h3>
              <p className="text-xs text-slate-400">
                학교 무선 인터넷(Wi-Fi) 연결을 확인한 후 아래 버튼을 눌러주세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchState()}
              className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              다시 연결하기
            </button>
          </div>
        ) : (
          <>
            {currentMode === 'home' && (
              <ModeSelection
                onSelectMode={setCurrentMode}
                totalFeedbacks={appState.feedbacks.length}
                totalStudents={appState.students.length}
              />
            )}

            {currentMode === 'game' && (
              <GameMode
                classes={appState.classes}
                students={appState.students}
                gameScores={appState.gameScores}
                onSaveScore={handleSaveGameScore}
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
                onSubmitTeacherFeedback={handleSubmitTeacherFeedback}
                onSetActiveSession={handleSetActiveSession}
                onBatchSetActiveSession={handleBatchSetActiveSession}
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
