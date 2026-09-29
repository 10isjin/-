import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { getDefaultSessionQuestions } from "./defaultData";

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore specifying database ID
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Validate connection to Firestore as mandated by integration guidelines
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, "app_state", "global_state"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testFirestoreConnection();

const STATE_DOC_REF = doc(db, "app_state", "global_state");

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
    // Exclude large or redundant binary fields, keep clean JSON and strip any undefined keys
    // Do not use merge: true so that deleted questions/classes/feedbacks are properly cleared
    const cleanPayload = JSON.parse(JSON.stringify({
      classes: state.classes || [],
      students: state.students || [],
      feedbacks: state.feedbacks || [],
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
    await setDoc(STATE_DOC_REF, cleanPayload);
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
