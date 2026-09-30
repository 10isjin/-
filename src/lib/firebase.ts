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
  getDocFromServer
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

// Validate connection to Firestore
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(STATE_DOC_REF);
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

// Save or update a single feedback document permanently in Firestore
export async function saveFeedbackToFirestore(feedback: FeedbackItem): Promise<boolean> {
  try {
    if (!feedback || !feedback.id) return false;
    const cleanItem = JSON.parse(JSON.stringify(feedback));
    await setDoc(doc(db, "feedbacks", feedback.id), cleanItem, { merge: true });
    return true;
  } catch (err) {
    console.error("[Firestore] Error saving individual feedback:", err);
    return false;
  }
}

// Update star reward state on a single feedback document
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
    await setDoc(ref, updateData, { merge: true });
    return true;
  } catch (err) {
    console.error("[Firestore] Error updating feedback reward in Firestore:", err);
    return false;
  }
}

// Fetch all feedbacks directly from the /feedbacks collection
export async function fetchFeedbacksFromFirestore(): Promise<FeedbackItem[]> {
  try {
    const snap = await getDocs(FEEDBACKS_COLLECTION);
    const list: FeedbackItem[] = [];
    snap.forEach((d) => {
      const item = d.data() as FeedbackItem;
      if (item && item.id) list.push(item);
    });
    return list;
  } catch (err) {
    console.error("[Firestore] Error fetching feedbacks collection:", err);
    return [];
  }
}

// Real-time listener for the /feedbacks collection
// Whenever ANY student in any class submits or stars a feedback, all students & teachers receive it instantly!
export function subscribeToFeedbacksCollection(callback: (feedbacks: FeedbackItem[]) => void): () => void {
  return onSnapshot(
    FEEDBACKS_COLLECTION,
    (snap) => {
      const list: FeedbackItem[] = [];
      snap.forEach((d) => {
        const item = d.data() as FeedbackItem;
        if (item && item.id) {
          list.push(item);
        }
      });
      callback(list);
    },
    (err) => {
      console.warn("[Firestore] Realtime feedbacks collection snapshot error:", err);
    }
  );
}

// Delete a single feedback document from Firestore
export async function deleteFeedbackFromFirestore(feedbackId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "feedbacks", feedbackId));
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
    const snap = await getDocs(FEEDBACKS_COLLECTION);
    const batch = writeBatch(db);
    let count = 0;
    snap.forEach((docSnap) => {
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
    if (count > 0) {
      await batch.commit();
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
    const snap = await getDoc(STATE_DOC_REF);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.error("[Firestore] Error fetching state:", err);
  }
  return null;
}

export async function saveStateToFirestore(state: any): Promise<boolean> {
  try {
    const cleanPayload = JSON.parse(JSON.stringify({
      classes: state.classes || [],
      students: state.students || [],
      aiEvaluations: state.aiEvaluations || {},
      teacherQuestions: state.teacherQuestions || {},
      classSessionQuestions: state.classSessionQuestions || {},
      sessionQuestions: {
        ...getDefaultSessionQuestions(),
        ...(state.sessionQuestions || {})
      },
      studentAnswers: state.studentAnswers || {},
      activeSessions: state.activeSessions || {},
      gameScores: state.gameScores || [],
      updatedAt: Date.now()
    }));
    await setDoc(STATE_DOC_REF, cleanPayload, { merge: true });
    return true;
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
