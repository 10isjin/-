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
  limit
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { getDefaultSessionQuestions } from "./defaultData";
import { FeedbackItem } from "../types";

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore specifying database ID
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Primary document & collection references
const STATE_DOC_REF = doc(db, "app_state", "global_state");
export const FEEDBACKS_COLLECTION = collection(db, "feedbacks");

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
    }).catch(() => fallback),
    timeoutPromise
  ]);
}

// Validate connection to Firestore
export async function testFirestoreConnection() {
  try {
    await withTimeout(getDocFromServer(STATE_DOC_REF), 3000, null as any);
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testFirestoreConnection();

/**
 * 1. INDIVIDUAL FEEDBACK DOCUMENT OPERATIONS
 * Every feedback is stored as an independent document in /feedbacks/{id}.
 * Multiple students writing simultaneously can NEVER overwrite or collide with each other!
 */

// Save or update a single feedback document permanently in Firestore (Strictly isolated doc write, 0 broadcast reads)
export async function saveFeedbackToFirestore(feedback: FeedbackItem): Promise<boolean> {
  try {
    if (!feedback || !feedback.id) return false;
    const cleanItem = JSON.parse(JSON.stringify(feedback));
    
    // Direct doc write to /feedbacks/{id} (isolated doc)
    await withTimeout(
      setDoc(doc(db, "feedbacks", feedback.id), cleanItem, { merge: true }),
      4000,
      undefined
    );
    return true;
  } catch (err) {
    console.error("[Firestore] Error saving individual feedback:", err);
    return false;
  }
}

// Update star reward state on a single feedback document (Strictly isolated doc write, 0 broadcast reads)
export async function rewardFeedbackInFirestore(
  feedbackId: string,
  favoriteRewarded: boolean,
  favoriteRewardedAt?: number
): Promise<boolean> {
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
      4000,
      undefined
    );
    return true;
  } catch (err) {
    console.error("[Firestore] Error updating feedback reward in Firestore:", err);
    return false;
  }
}

// Fetch all feedbacks - optimized to check central STATE_DOC_REF first (1 read instead of 300 reads!)
export async function fetchFeedbacksFromFirestore(): Promise<FeedbackItem[]> {
  try {
    const snap = await withTimeout(getDoc(STATE_DOC_REF), 4000, null as any);
    if (snap && snap.exists && snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.feedbacks) && data.feedbacks.length > 0) {
        return data.feedbacks as FeedbackItem[];
      }
    }
  } catch (err) {
    console.warn("[Firestore] Error fetching feedbacks from STATE_DOC_REF:", err);
  }

  // Fallback to collection only if state doc is empty
  try {
    const snap = await withTimeout(getDocs(FEEDBACKS_COLLECTION), 4000, null as any);
    if (!snap) return [];
    const list: FeedbackItem[] = [];
    snap.forEach((d: any) => {
      const item = d.data() as FeedbackItem;
      if (item && item.id) list.push(item);
    });
    return list;
  } catch (err) {
    console.warn("[Firestore] Error fetching feedbacks collection:", err);
    return [];
  }
}

// Real-time listener: listens to individual new/modified feedbacks in /feedbacks
// Real-time stream captures newly submitted feedbacks and star updates for the entire class session
export function subscribeToFeedbacksCollection(callback: (feedbacks: FeedbackItem[]) => void): () => void {
  try {
    const q = query(FEEDBACKS_COLLECTION, orderBy('timestamp', 'desc'), limit(60));
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
        console.warn("[Firestore] Realtime individual feedbacks snapshot error:", err);
      }
    );
  } catch (err) {
    console.warn("[Firestore] Error attaching feedbacks query listener:", err);
    return () => {};
  }
}

// Batch push local vault feedbacks to Firestore to guarantee cloud sync across all devices
export async function syncVaultFeedbacksToFirestore(vaultFeedbacks: FeedbackItem[]): Promise<boolean> {
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
    console.warn("[Firestore] Error syncing vault feedbacks to Firestore:", e);
    return false;
  }
}

// Delete a single feedback document from Firestore
export async function deleteFeedbackFromFirestore(feedbackId: string): Promise<boolean> {
  try {
    await withTimeout(deleteDoc(doc(db, "feedbacks", feedbackId)), 3000, false as any);
    return true;
  } catch (err) {
    console.error("[Firestore] Error deleting feedback doc:", err);
    return false;
  }
}

// Clear feedbacks in batch from Firestore (Teacher Mode reset)
export async function clearFeedbacksInFirestore(filter?: {
  classId?: string;
  shotType?: string;
  studentId?: string;
  session?: number | 'all';
}): Promise<number> {
  try {
    const snap = await withTimeout(getDocs(FEEDBACKS_COLLECTION), 4000, null as any);
    if (!snap) return 0;
    const batch = writeBatch(db);
    let count = 0;
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
        batch.delete(docSnap.ref);
        count++;
      }
    });
    if (count > 0 || !filter || filter.classId === 'all') {
      await withTimeout(batch.commit(), 4000, false as any);
      // Ensure STATE_DOC_REF also syncs empty feedbacks
      await withTimeout(setDoc(STATE_DOC_REF, { feedbacks: [] }, { merge: true }), 3000, false as any);
    }
    return count;
  } catch (err) {
    console.error("[Firestore] Error clearing feedbacks in Firestore:", err);
    return 0;
  }
}

/**
 * 2. GLOBAL APP STATE (Classes, Questions, Active Sessions)
 */
export async function fetchStateFromFirestore(): Promise<any | null> {
  try {
    const snap = await withTimeout(getDoc(STATE_DOC_REF), 4000, null as any);
    if (snap && snap.exists && snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.error("[Firestore] Error fetching state:", err);
  }
  return null;
}

export async function saveStudentAnswerToFirestore(answer: any): Promise<boolean> {
  try {
    if (!answer || !answer.classId || !answer.studentId || !answer.answer) return false;
    const session = answer.session || 1;
    const canonicalKey = `${answer.classId}_${answer.studentId}_s${session}`;
    const cleanAnswer = {
      ...answer,
      id: `ans_${canonicalKey}`,
      session,
      updatedAt: answer.updatedAt || Date.now()
    };
    const payload = {
      studentAnswers: {
        [canonicalKey]: cleanAnswer
      },
      updatedAt: Date.now()
    };
    const ok = await withTimeout(
      setDoc(STATE_DOC_REF, payload, { merge: true }).then(() => true),
      4000,
      false
    );
    return Boolean(ok);
  } catch {
    return false;
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
  try {
    const ok = await withTimeout(
      setDoc(STATE_DOC_REF, {
        activeSessions,
        updatedAt: Date.now()
      }, { merge: true }).then(() => true),
      4000,
      false
    );
    return Boolean(ok);
  } catch (err) {
    console.error("[Firestore] Error saving active sessions:", err);
    return false;
  }
}

export async function saveStateToFirestore(
  state: any,
  options?: { includeFeedbacks?: boolean; includeStudentAnswers?: boolean }
): Promise<boolean> {
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
      4000,
      false
    );
    return Boolean(ok);
  } catch (err) {
    console.error("[Firestore] Error saving state:", err);
    return false;
  }
}

export function subscribeToFirestoreState(callback: (data: any) => void): () => void {
  return onSnapshot(
    STATE_DOC_REF,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      }
    },
    (err) => {
      console.warn("[Firestore] Realtime snapshot error:", err);
    }
  );
}
