import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
  onSnapshot,
  getDocFromServer,
  query,
  orderBy,
  limit,
  disableNetwork,
  enableNetwork,
  setLogLevel,
  arrayUnion
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { getDefaultSessionQuestions } from "./defaultData";
import { FeedbackItem } from "../types";

// Silence verbose Firebase SDK internal backoff retry logs
try {
  setLogLevel("silent");
} catch {}

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore specifying database ID
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Primary document & collection references
const STATE_DOC_REF = doc(db, "app_state", "global_state");
export const FEEDBACKS_COLLECTION = collection(db, "feedbacks");
export const STUDENT_ANSWERS_COLLECTION = collection(db, "student_answers");

// Quota Circuit Breaker: If Firestore hits daily free tier write/read quota,
// pause cloud Firestore write attempts to prevent console error storms and SDK retry loops.
let isFirestoreQuotaExhausted = false;
let quotaExhaustedResetTime = 0;

type QuotaListener = (exhausted: boolean) => void;
const quotaListeners: Set<QuotaListener> = new Set();

export function onQuotaStateChange(listener: QuotaListener): () => void {
  quotaListeners.add(listener);
  listener(isFirestoreQuotaExhausted);
  return () => {
    quotaListeners.delete(listener);
  };
}

function notifyQuotaListeners(exhausted: boolean) {
  quotaListeners.forEach(listener => {
    try {
      listener(exhausted);
    } catch {}
  });
}

export function isQuotaExhausted(): boolean {
  if (!isFirestoreQuotaExhausted) return false;
  if (Date.now() > quotaExhaustedResetTime) {
    isFirestoreQuotaExhausted = false;
    notifyQuotaListeners(false);
    return false;
  }
  return true;
}

export function handleFirestoreError(err: any, operationName = "operation") {
  if (!err) return;
  const errMsg = typeof err?.message === "string" ? err.message : "";
  const errCode = err?.code || "";

  // True daily project quota exhaustion has specific cause or phrasing from Google Cloud
  const isDailyProjectQuota =
    errMsg.includes("Free daily write units per project") ||
    errMsg.includes("Free daily read units per project") ||
    errMsg.includes("per day' of service 'firestore.googleapis.com'") ||
    errMsg.includes("Quota exceeded for quota metric 'Free daily");

  // Document-level rate limit contention (1 write/sec per doc) or transient throttle
  const isDocRateContention =
    !isDailyProjectQuota &&
    (errCode === "resource-exhausted" || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("resource-exhausted"));

  if (isDailyProjectQuota) {
    if (!isFirestoreQuotaExhausted) {
      console.warn(`[Firestore] Daily project quota reached during ${operationName}.`);
      isFirestoreQuotaExhausted = true;
      quotaExhaustedResetTime = Date.now() + 10 * 1000;
      notifyQuotaListeners(true);
    }
    return;
  }

  if (isDocRateContention) {
    console.warn(`[Firestore] Transient document rate contention during ${operationName}. Handled safely without locking app.`);
    return;
  }

  console.warn(`[Firestore] ${operationName} error:`, errMsg || err);
}

// Resilient promise timeout helper to prevent UI freezing / hanging
export function withTimeout<T>(promise: Promise<T>, ms = 4000, fallback: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }).catch((err) => {
      handleFirestoreError(err, "withTimeout");
      return fallback;
    }),
    timeoutPromise
  ]);
}

/**
 * 1. INDIVIDUAL FEEDBACK DOCUMENT OPERATIONS
 * Every feedback is stored as an independent document in /feedbacks/{id}.
 * Multiple students writing simultaneously can NEVER overwrite or collide with each other!
 */

// Save or update a single feedback document permanently in Firestore
// 1) Saves isolated doc to /feedbacks/{id}
// 2) Atomically appends to central STATE_DOC_REF so ALL students and teacher devices receive real-time sync instantly!
export async function saveFeedbackToFirestore(feedback: FeedbackItem): Promise<boolean> {
  if (isQuotaExhausted()) return false;
  try {
    if (!feedback || !feedback.id) return false;
    const cleanItem = JSON.parse(JSON.stringify(feedback));
    
    // Direct doc write to /feedbacks/{id} (isolated doc)
    await withTimeout(
      setDoc(doc(db, "feedbacks", feedback.id), cleanItem, { merge: true }),
      8000,
      undefined
    );

    // Atomically append to STATE_DOC_REF so all real-time connected clients see it instantly!
    withTimeout(
      setDoc(STATE_DOC_REF, {
        feedbacks: arrayUnion(cleanItem),
        updatedAt: Date.now()
      }, { merge: true }),
      8000,
      undefined
    ).catch(() => {});

    return true;
  } catch (err) {
    handleFirestoreError(err, "saveFeedback");
    return false;
  }
}

// Update star reward state on a single feedback document (Strictly isolated doc write, 0 broadcast reads)
// Update star reward state on a single feedback document and central state doc for instant real-time sync across all devices
export async function rewardFeedbackInFirestore(
  feedbackId: string,
  favoriteRewarded: boolean,
  favoriteRewardedAt?: number
): Promise<boolean> {
  if (isQuotaExhausted()) return false;
  try {
    const ref = doc(db, "feedbacks", feedbackId);
    const updateData: Record<string, any> = {
      favoriteRewarded,
      updatedAt: Date.now()
    };
    if (favoriteRewardedAt) {
      updateData.favoriteRewardedAt = favoriteRewardedAt;
    }
    await withTimeout(
      setDoc(ref, updateData, { merge: true }),
      8000,
      undefined
    );

    // Atomically sync the star update to central STATE_DOC_REF so ALL devices receive real-time star updates instantly!
    withTimeout(
      (async () => {
        const snap = await getDoc(STATE_DOC_REF);
        if (snap.exists()) {
          const currentFeedbacks = snap.data().feedbacks;
          if (Array.isArray(currentFeedbacks)) {
            let changed = false;
            const nextFeedbacks = currentFeedbacks.map((f: FeedbackItem) => {
              if (f.id === feedbackId) {
                changed = true;
                return {
                  ...f,
                  favoriteRewarded,
                  favoriteRewardedAt: favoriteRewarded ? (favoriteRewardedAt || Date.now()) : undefined,
                  updatedAt: Date.now()
                };
              }
              return f;
            });
            if (changed) {
              const cleanNext = JSON.parse(JSON.stringify(nextFeedbacks));
              await setDoc(STATE_DOC_REF, { feedbacks: cleanNext, updatedAt: Date.now() }, { merge: true });
            }
          }
        }
      })(),
      8000,
      undefined
    ).catch(() => {});

    return true;
  } catch (err) {
    handleFirestoreError(err, "rewardFeedback");
    return false;
  }
}

// Fetch all feedbacks directly from authoritative isolated FEEDBACKS_COLLECTION
export async function fetchFeedbacksFromFirestore(): Promise<FeedbackItem[]> {
  if (isQuotaExhausted()) return [];
  try {
    const snap = await withTimeout(getDocs(FEEDBACKS_COLLECTION), 8000, null as any);
    if (!snap) return [];
    const list: FeedbackItem[] = [];
    snap.forEach((d: any) => {
      const item = d.data() as FeedbackItem;
      if (item && item.id) list.push(item);
    });
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return list;
  } catch (err) {
    handleFirestoreError(err, "fetchFeedbacksCollection");
    return [];
  }
}

// Real-time listener: listens to individual new/modified feedbacks in /feedbacks
// Real-time stream captures newly submitted feedbacks and star updates for the entire class session
export function subscribeToFeedbacksCollection(callback: (feedbacks: FeedbackItem[]) => void): () => void {
  if (isQuotaExhausted()) return () => {};
  try {
    const q = query(FEEDBACKS_COLLECTION, orderBy('updatedAt', 'desc'), limit(300));
    return onSnapshot(
      q,
      (snap) => {
        const items: FeedbackItem[] = [];
        snap.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const item = change.doc.data() as FeedbackItem;
            if (item && item.id) items.push(item);
          }
        });
        if (items.length > 0) {
          callback(items);
        }
      },
      (err) => {
        handleFirestoreError(err, "feedbacksListener");
      }
    );
  } catch (err) {
    handleFirestoreError(err, "subscribeToFeedbacksCollection");
    return () => {};
  }
}

// Batch push local vault feedbacks to Firestore to guarantee cloud sync across all devices
export async function syncVaultFeedbacksToFirestore(vaultFeedbacks: FeedbackItem[]): Promise<boolean> {
  if (isQuotaExhausted()) return false;
  if (!Array.isArray(vaultFeedbacks) || vaultFeedbacks.length === 0) return true;
  try {
    let existingFeedbacks: FeedbackItem[] = [];
    try {
      const stateDoc = await withTimeout(getDoc(STATE_DOC_REF), 4000, null as any);
      if (stateDoc && stateDoc.exists && stateDoc.exists()) {
        const d = stateDoc.data();
        if (Array.isArray(d.feedbacks)) existingFeedbacks = d.feedbacks;
      }
    } catch {}

    const TEST_PERIOD_CUTOFF = 1791126000000;
    const map = new Map<string, FeedbackItem>();
    existingFeedbacks.forEach(f => {
      if (f && f.id && (!f.timestamp || f.timestamp >= TEST_PERIOD_CUTOFF)) {
        map.set(f.id, f);
      }
    });
    vaultFeedbacks.forEach(f => {
      if (f && f.id && (!f.timestamp || f.timestamp >= TEST_PERIOD_CUTOFF)) {
        const curr = map.get(f.id);
        if (!curr) {
          map.set(f.id, f);
        } else {
          map.set(f.id, {
            ...curr,
            ...f,
            favoriteRewarded: Boolean(curr.favoriteRewarded || f.favoriteRewarded),
            favoriteRewardedAt: curr.favoriteRewardedAt || f.favoriteRewardedAt
          });
        }
      }
    });
    const mergedList = Array.from(map.values());

    const ok = await withTimeout(
      setDoc(STATE_DOC_REF, {
        feedbacks: mergedList,
        updatedAt: Date.now()
      }, { merge: true }).then(() => true),
      4000,
      false
    );

    return Boolean(ok);
  } catch (e) {
    handleFirestoreError(e, "syncVaultFeedbacksToFirestore");
    return false;
  }
}

// Delete a single feedback document from Firestore
export async function deleteFeedbackFromFirestore(feedbackId: string): Promise<boolean> {
  if (isQuotaExhausted()) return false;
  try {
    await withTimeout(deleteDoc(doc(db, "feedbacks", feedbackId)), 3000, false as any);
    return true;
  } catch (err) {
    handleFirestoreError(err, "deleteFeedback");
    return false;
  }
}

export async function clearFeedbacksInFirestore(filter?: {
  classId?: string;
  shotType?: string;
  studentId?: string;
  session?: number | 'all';
}): Promise<number> {
  if (isQuotaExhausted()) return 0;
  try {
    const snap = await withTimeout(getDocs(FEEDBACKS_COLLECTION), 8000, null as any);
    if (!snap) return 0;
    
    const matchingRefs: any[] = [];
    snap.forEach((docSnap: any) => {
      const data = docSnap.data() as FeedbackItem;
      let matches = true;
      if (filter) {
        if (filter.classId && filter.classId !== 'all' && data.classId !== filter.classId) matches = false;
        if (filter.shotType && filter.shotType !== 'all' && data.shotType !== filter.shotType) matches = false;
        if (filter.studentId && filter.studentId !== 'all' && data.performerId !== filter.studentId) matches = false;
        if (filter.session && filter.session !== 'all' && (data.session || 1) !== filter.session) matches = false;
      }
      if (matches) {
        matchingRefs.push(docSnap.ref);
      }
    });

    // Chunk into batches of 400 to respect Firestore 500-op per batch hard limit
    for (let i = 0; i < matchingRefs.length; i += 400) {
      const chunk = matchingRefs.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach(ref => batch.delete(ref));
      await withTimeout(batch.commit(), 8000, false as any);
    }

    if (matchingRefs.length > 0 || !filter || filter.classId === 'all') {
      await withTimeout(setDoc(STATE_DOC_REF, { feedbacks: [] }, { merge: true }), 4000, false as any);
    }
    return matchingRefs.length;
  } catch (err) {
    handleFirestoreError(err, "clearFeedbacks");
    return 0;
  }
}

/**
 * 2. GLOBAL APP STATE (Classes, Questions, Active Sessions)
 */
export async function fetchStateFromFirestore(): Promise<any | null> {
  if (isQuotaExhausted()) return null;
  try {
    const snap = await withTimeout(getDoc(STATE_DOC_REF), 4000, null as any);
    if (snap && snap.exists && snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    handleFirestoreError(err, "fetchStateFromFirestore");
  }
  return null;
}

export async function saveStudentAnswerToFirestore(answer: any): Promise<boolean> {
  if (isQuotaExhausted()) return false;
  try {
    if (!answer || !answer.classId || !answer.studentId || !answer.answer) return false;
    const session = answer.session || 1;
    const canonicalKey = `${answer.classId}_${answer.studentId}_s${session}`;
    const cleanAnswer = JSON.parse(JSON.stringify({
      ...answer,
      id: `ans_${canonicalKey}`,
      session,
      updatedAt: answer.updatedAt || Date.now()
    }));
    
    // 1. Direct isolated doc write to /student_answers/{canonicalKey}
    await withTimeout(
      setDoc(doc(db, "student_answers", canonicalKey), cleanAnswer, { merge: true }),
      8000,
      undefined
    );

    // 2. Also write to central STATE_DOC_REF so ALL students and teacher devices receive the answer instantly in real-time!
    withTimeout(
      setDoc(STATE_DOC_REF, {
        studentAnswers: {
          [canonicalKey]: cleanAnswer
        },
        updatedAt: Date.now()
      }, { merge: true }),
      8000,
      undefined
    ).catch(() => {});

    return true;
  } catch (err) {
    handleFirestoreError(err, "saveStudentAnswer");
    return false;
  }
}

// Real-time listener for student answers collection
export function subscribeToStudentAnswersCollection(callback: (answers: Record<string, any>) => void): () => void {
  if (isQuotaExhausted()) return () => {};
  try {
    return onSnapshot(
      STUDENT_ANSWERS_COLLECTION,
      (snap) => {
        const answersMap: Record<string, any> = {};
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.classId && data.studentId) {
            const sess = data.session || 1;
            const key = `${data.classId}_${data.studentId}_s${sess}`;
            answersMap[key] = data;
          }
        });
        if (Object.keys(answersMap).length > 0) {
          callback(answersMap);
        }
      },
      (err) => {
        handleFirestoreError(err, "studentAnswersListener");
      }
    );
  } catch (err) {
    handleFirestoreError(err, "subscribeToStudentAnswersCollection");
    return () => {};
  }
}

export function canonicalizeAnswersMap(answers: any): Record<string, any> {
  const result: Record<string, any> = {};
  if (!answers || typeof answers !== 'object') return result;
  const TEST_PERIOD_CUTOFF = 1791126000000;
  for (const [key, val] of Object.entries(answers)) {
    const v: any = val;
    if (!v || !v.studentId) continue;
    const t = v.updatedAt || v.submittedAt || v.timestamp || 0;
    if (t && t < TEST_PERIOD_CUTOFF) continue;
    if (v.classId === '3-1' && (v.studentName === '권아준' || v.studentId.includes('c3-1-1'))) {
      continue;
    }
    const session = v.session || 1;
    const canonicalKey = `${v.classId}_${v.studentId}_s${session}`;
    v.session = session;
    v.id = `ans_${v.classId}_${v.studentId}_s${session}`;
    const existing = result[canonicalKey];
    if (!existing || (v.updatedAt || 0) >= (existing.updatedAt || 0)) {
      result[canonicalKey] = v;
    }
  }
  return result;
}

export async function saveActiveSessionsToFirestore(activeSessions: Record<string, number>): Promise<boolean> {
  if (isQuotaExhausted()) return false;
  try {
    const ok = await withTimeout(
      setDoc(STATE_DOC_REF, {
        activeSessions,
        updatedAt: Date.now()
      }, { merge: true }).then(() => true),
      8000,
      false
    );
    return Boolean(ok);
  } catch (err) {
    handleFirestoreError(err, "saveActiveSessions");
    return false;
  }
}

export async function saveStateToFirestore(
  state: any,
  options?: { includeFeedbacks?: boolean; includeStudentAnswers?: boolean }
): Promise<boolean> {
  if (isQuotaExhausted()) return false;
  try {
    const cleanPayload: Record<string, any> = {
      classes: state.classes || [],
      students: state.students || [],
      aiEvaluations: state.aiEvaluations || {},
      teacherQuestions: state.teacherQuestions || {},
      classSessionQuestions: state.classSessionQuestions || {},
      sessionQuestions: {
        ...getDefaultSessionQuestions(),
        ...(state.sessionQuestions || {})
      },
      activeSessions: state.activeSessions || {},
      gameScores: state.gameScores || [],
      updatedAt: Date.now()
    };

    // Feedbacks are stored independently in /feedbacks/{id} collection.
    // NEVER overwrite the central state feedbacks unless explicitly requested (e.g. backup restore or manual sync).
    if (options?.includeFeedbacks && Array.isArray(state.feedbacks)) {
      cleanPayload.feedbacks = state.feedbacks;
    }

    // Student answers are stored per student via saveStudentAnswerToFirestore.
    // Only synchronize the entire map if explicitly requested (e.g. initial import or manual purge).
    if (options?.includeStudentAnswers && state.studentAnswers) {
      cleanPayload.studentAnswers = canonicalizeAnswersMap(state.studentAnswers);
    }

    const ok = await withTimeout(
      setDoc(STATE_DOC_REF, cleanPayload, { merge: true }).then(() => true),
      8000,
      false
    );
    return Boolean(ok);
  } catch (err) {
    handleFirestoreError(err, "saveState");
    return false;
  }
}

// Atomic save for individual AI Evaluation to eliminate document overwrite collisions
export async function saveAiEvaluationToFirestore(cacheKey: string, evalData: any): Promise<boolean> {
  if (isQuotaExhausted()) return false;
  try {
    const ok = await withTimeout(
      setDoc(STATE_DOC_REF, {
        [`aiEvaluations.${cacheKey}`]: JSON.parse(JSON.stringify(evalData)),
        updatedAt: Date.now()
      }, { merge: true }).then(() => true),
      8000,
      false
    );
    return Boolean(ok);
  } catch (err) {
    handleFirestoreError(err, "saveAiEvaluation");
    return false;
  }
}

export function subscribeToFirestoreState(callback: (data: any) => void): () => void {
  if (isQuotaExhausted()) return () => {};
  try {
    return onSnapshot(
      STATE_DOC_REF,
      (snap) => {
        if (snap.exists()) {
          callback(snap.data());
        }
      },
      (err) => {
        handleFirestoreError(err, "subscribeToFirestoreState");
      }
    );
  } catch (err) {
    handleFirestoreError(err, "subscribeToFirestoreStateAttach");
    return () => {};
  }
}
