import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";
import {
  MIDDLE_SHOT_CRITERIA,
  LAYUP_SHOT_CRITERIA,
  Classroom,
  Student,
  FeedbackItem,
  AiEvaluation,
  AppStateData,
  TeacherQuestion,
  StudentAnswer,
  GameScoreItem
} from "./src/types";
import { getDefaultAppState, getDefaultClasses, getDefaultStudents, getDefaultSessionQuestions } from "./src/lib/defaultData";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Firebase App & Firestore
const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const firestoreDb = firebaseConfig.firestoreDatabaseId
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);
const FIRESTORE_STATE_DOC = doc(firestoreDb, "app_state", "global_state");

// Persistent storage setup
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "app-state.json");
const BACKUP_FILE = path.join(DATA_DIR, "app-state.backup.json");

// Save state to both local disk AND Firestore Cloud Database
function saveState(state: AppStateData) {
  // 1. Local disk save
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = path.join(DATA_DIR, `app-state.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`);
    const serialized = JSON.stringify(state, null, 2);
    fs.writeFileSync(tempFile, serialized, "utf-8");

    // Maintain secondary disk backup file before overwriting main file
    if (fs.existsSync(DATA_FILE)) {
      try {
        fs.copyFileSync(DATA_FILE, BACKUP_FILE);
      } catch (e) {
        // secondary backup copy error ignored
      }
    }

    // Atomic replace
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error("Failed to save appState to disk:", err);
  }

  // 2. Cloud Firestore save (async background with deep undefined sanitization)
  try {
    const sanitizedFirestorePayload = JSON.parse(JSON.stringify({
      classes: state.classes || [],
      students: state.students || [],
      feedbacks: state.feedbacks || [],
      aiEvaluations: state.aiEvaluations || {},
      teacherQuestions: state.teacherQuestions || {},
      sessionQuestions: state.sessionQuestions || {},
      classSessionQuestions: state.classSessionQuestions || {},
      studentAnswers: state.studentAnswers || {},
      activeSessions: state.activeSessions || {},
      gameScores: state.gameScores || [],
      updatedAt: Date.now()
    }));

    setDoc(FIRESTORE_STATE_DOC, sanitizedFirestorePayload).catch(err => {
      console.warn("[Firestore] Failed to save state to Cloud Firestore:", err);
    });
  } catch (err) {
    console.warn("[Firestore] Error preparing state for Cloud Firestore:", err);
  }
}

// Function to pull latest state from Firestore cloud on startup
async function syncFromFirestore(): Promise<AppStateData | null> {
  try {
    console.log("[Firestore] Fetching persistent state from Cloud Firestore...");
    const snap = await getDoc(FIRESTORE_STATE_DOC);
    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.classes) && Array.isArray(data.students)) {
        console.log(`[Firestore] Successfully restored from Cloud Firestore! (${data.classes.length} classes, ${data.students.length} students, ${data.feedbacks?.length || 0} feedbacks)`);
        return {
          classes: data.classes,
          students: data.students,
          feedbacks: Array.isArray(data.feedbacks) ? data.feedbacks : [],
          aiEvaluations: data.aiEvaluations || {},
          teacherQuestions: data.teacherQuestions || {},
          sessionQuestions: data.sessionQuestions || {},
          classSessionQuestions: data.classSessionQuestions || {},
          studentAnswers: data.studentAnswers || {},
          activeSessions: data.activeSessions || {},
          gameScores: Array.isArray(data.gameScores) ? data.gameScores : []
        };
      }
    }
  } catch (err) {
    console.warn("[Firestore] Cloud Firestore initial sync error:", err);
  }
  return null;
}

// Lazy initialize Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Default initial state for classroom basketball lesson with all 321 registered students
function getInitialData(): AppStateData {
  return getDefaultAppState();
}

function loadState(): AppStateData {
  const tryLoad = (filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.classes) && Array.isArray(parsed.students)) {
          return {
            classes: parsed.classes,
            students: parsed.students,
            feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : [],
            aiEvaluations: parsed.aiEvaluations || {},
            teacherQuestions: parsed.teacherQuestions || {},
            sessionQuestions: (parsed.sessionQuestions && Object.keys(parsed.sessionQuestions).length > 0) ? parsed.sessionQuestions : getDefaultSessionQuestions(),
            studentAnswers: parsed.studentAnswers || {},
            activeSessions: parsed.activeSessions || {},
            gameScores: Array.isArray(parsed.gameScores) ? parsed.gameScores : []
          };
        }
      }
    } catch (err) {
      console.warn(`[ShootingStar] Could not load ${filePath}:`, err);
    }
    return null;
  };

  const loaded = tryLoad(DATA_FILE) || tryLoad(BACKUP_FILE);
  if (loaded) {
    if (!loaded.sessionQuestions || Object.keys(loaded.sessionQuestions).length === 0) {
      loaded.sessionQuestions = getDefaultSessionQuestions();
      saveState(loaded);
    }
    console.log(`[ShootingStar] Loaded persistent data: ${loaded.classes.length} classes, ${loaded.students.length} students, ${loaded.feedbacks.length} feedbacks`);
    return loaded;
  }

  console.log("[ShootingStar] No saved state found. Initializing defaults.");
  const defaultData = getInitialData();
  saveState(defaultData);
  return defaultData;
}

let appState: AppStateData = loadState();
const TEACHER_PIN = "0221";

// ================= API ROUTES =================

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "shooting-star" });
});

// 1. Get full app state
app.get("/api/state", (_req, res) => {
  res.json({
    success: true,
    data: appState
  });
});

// 2. Teacher auth
app.post("/api/teacher/auth", (req, res) => {
  const { pin } = req.body;
  if (pin === TEACHER_PIN) {
    return res.json({ success: true, message: "인증되었습니다." });
  }
  return res.status(401).json({ success: false, message: "비밀번호가 일치하지 않습니다." });
});

// 3. Add classroom
app.post("/api/classes", (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string") {
    return res.status(400).json({ success: false, message: "학급 명칭을 입력해주세요." });
  }
  const newId = String(Date.now());
  const newClass: Classroom = { id: newId, name: name.trim() };
  appState.classes.push(newClass);
  saveState(appState);
  res.json({ success: true, classroom: newClass });
});

// 3-1. Update classroom name
app.put("/api/classes/:id", (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ success: false, message: "수정할 학급 명칭을 입력해주세요." });
  }
  const targetClass = appState.classes.find(c => c.id === id);
  if (!targetClass) {
    return res.status(404).json({ success: false, message: "해당 학급을 찾을 수 없습니다." });
  }
  targetClass.name = name.trim();
  saveState(appState);
  res.json({ success: true, classroom: targetClass });
});

// 3-2. Delete classroom
app.delete("/api/classes/:id", (req, res) => {
  const { id } = req.params;
  const targetIndex = appState.classes.findIndex(c => c.id === id);
  if (targetIndex === -1) {
    return res.status(404).json({ success: false, message: "해당 학급을 찾을 수 없습니다." });
  }

  const deletedClass = appState.classes.splice(targetIndex, 1)[0];
  // Remove students belonging to this class
  appState.students = appState.students.filter(s => s.classId !== id);
  // Remove feedbacks belonging to this class
  appState.feedbacks = appState.feedbacks.filter(f => f.classId !== id);
  saveState(appState);

  res.json({
    success: true,
    deletedId: id,
    message: `${deletedClass.name} 학급이 삭제되었습니다.`
  });
});

// 3-3. Batch register 3학년 1~11반
app.post("/api/classes/batch-grade3", (req, res) => {
  const { mode } = req.body || {}; // 'append' | 'reset-classes'
  const grade3Classes: Classroom[] = Array.from({ length: 11 }, (_, i) => ({
    id: `3-${i + 1}`,
    name: `3학년 ${i + 1}반`
  }));

  if (mode === 'reset-classes') {
    appState.classes = grade3Classes;
    // Clean orphan data
    const validIds = new Set(grade3Classes.map(c => c.id));
    appState.students = appState.students.filter(s => validIds.has(s.classId));
    appState.feedbacks = appState.feedbacks.filter(f => validIds.has(f.classId));
  } else {
    // Append any missing 3학년 1~11반
    for (const g3 of grade3Classes) {
      const exists = appState.classes.some(c => c.name === g3.name || c.id === g3.id);
      if (!exists) {
        appState.classes.push(g3);
      }
    }
  }

  saveState(appState);

  res.json({
    success: true,
    classes: appState.classes,
    message: "3학년 1~11반이 등록되었습니다."
  });
});

// 3-4. Save or reset teacher question for a specific class
app.post("/api/classes/:classId/question", (req, res) => {
  const { classId } = req.params;
  const { question, session } = req.body;

  if (!appState.teacherQuestions) {
    appState.teacherQuestions = {};
  }

  const cleanQuestion = (question || "").trim();
  if (!cleanQuestion) {
    // If empty question submitted, remove the question and answers for this class
    delete appState.teacherQuestions[classId];
    const currentAnswers = appState.studentAnswers;
    if (currentAnswers) {
      Object.keys(currentAnswers).forEach(key => {
        if (currentAnswers[key]?.classId === classId || key.startsWith(`${classId}_`)) {
          delete currentAnswers[key];
        }
      });
    }
    saveState(appState);
    return res.json({
      success: true,
      data: { classId, question: "", updatedAt: Date.now() },
      message: "오늘의 질문 및 답변이 초기화(삭제)되었습니다."
    });
  }

  const activeSess = typeof session === 'number' && session >= 1 && session <= 17
    ? session
    : (appState.activeSessions?.[classId] || 1);

  appState.teacherQuestions[classId] = {
    classId,
    question: cleanQuestion,
    session: activeSess,
    updatedAt: Date.now()
  };

  saveState(appState);

  res.json({
    success: true,
    data: appState.teacherQuestions[classId],
    message: "오늘의 질문이 성공적으로 등록/수정되었습니다."
  });
});

// Explicit DELETE endpoint for clearing a class question
app.delete("/api/classes/:classId/question", (req, res) => {
  const { classId } = req.params;
  if (appState.teacherQuestions && appState.teacherQuestions[classId]) {
    delete appState.teacherQuestions[classId];
  }
  // Clear all student answers belonging to this class question
  const currentAnswers = appState.studentAnswers;
  if (currentAnswers) {
    Object.keys(currentAnswers).forEach(key => {
      if (currentAnswers[key]?.classId === classId || key.startsWith(`${classId}_`)) {
        delete currentAnswers[key];
      }
    });
  }
  saveState(appState);
  res.json({
    success: true,
    data: { classId, question: "", updatedAt: Date.now() },
    message: "해당 학급의 오늘의 질문 및 답변이 완전히 초기화되었습니다."
  });
});

// 3-4-1. Get all 1~17 session questions
app.get("/api/session-questions", (_req, res) => {
  if (!appState.sessionQuestions || Object.keys(appState.sessionQuestions).length === 0) {
    appState.sessionQuestions = getDefaultSessionQuestions();
    saveState(appState);
  }
  res.json({
    success: true,
    sessionQuestions: appState.sessionQuestions
  });
});

// 3-4-2. Save a single session question (1~17)
app.post("/api/session-questions/:session", (req, res) => {
  const session = parseInt(req.params.session, 10);
  const { question } = req.body;

  if (isNaN(session) || session < 1 || session > 17) {
    return res.status(400).json({ success: false, message: "차시는 1~17차시 사이여야 합니다." });
  }

  if (!appState.sessionQuestions) {
    appState.sessionQuestions = getDefaultSessionQuestions();
  }

  appState.sessionQuestions[session] = (question || "").trim();
  saveState(appState);

  res.json({
    success: true,
    session,
    question: appState.sessionQuestions[session],
    message: `${session}차시 질문이 성공적으로 저장되었습니다.`
  });
});

// 3-4-3. Batch save session questions (1~17)
app.put("/api/session-questions", (req, res) => {
  const { questions } = req.body;
  if (questions && typeof questions === 'object') {
    appState.sessionQuestions = {
      ...(appState.sessionQuestions || getDefaultSessionQuestions()),
      ...questions
    };
    saveState(appState);
    return res.json({
      success: true,
      sessionQuestions: appState.sessionQuestions,
      message: "차시별 질문들이 성공적으로 저장되었습니다."
    });
  }
  return res.status(400).json({ success: false, message: "유효하지 않은 질문 데이터입니다." });
});

// 3-4-4. Get all session questions for a specific class
app.get("/api/classes/:classId/session-questions", (req, res) => {
  const { classId } = req.params;
  const questions = appState.classSessionQuestions?.[classId] || {};
  res.json({ success: true, classId, questions });
});

// 3-4-5. Save single session question for a specific class (1~17)
app.post("/api/classes/:classId/session-questions/:session", (req, res) => {
  const { classId, session } = req.params;
  const { question } = req.body;
  const sNum = parseInt(session, 10);
  if (isNaN(sNum) || sNum < 1 || sNum > 17) {
    return res.status(400).json({ success: false, message: "차시는 1~17차시 사이여야 합니다." });
  }

  if (!appState.classSessionQuestions) {
    appState.classSessionQuestions = {};
  }
  if (!appState.classSessionQuestions[classId]) {
    appState.classSessionQuestions[classId] = {};
  }

  const cleanQ = (question || "").trim();
  appState.classSessionQuestions[classId][sNum] = cleanQ;
  saveState(appState);

  res.json({
    success: true,
    classId,
    session: sNum,
    question: cleanQ,
    message: `${sNum}차시 질문이 성공적으로 저장되었습니다.`
  });
});

// 3-4-6. Batch save 1~17 session questions for a specific class
app.put("/api/classes/:classId/session-questions", (req, res) => {
  const { classId } = req.params;
  const { questions } = req.body;

  if (!appState.classSessionQuestions) {
    appState.classSessionQuestions = {};
  }
  if (!appState.classSessionQuestions[classId]) {
    appState.classSessionQuestions[classId] = {};
  }

  if (questions && typeof questions === 'object') {
    Object.keys(questions).forEach(key => {
      const sNum = parseInt(key, 10);
      if (!isNaN(sNum) && sNum >= 1 && sNum <= 17) {
        appState.classSessionQuestions![classId][sNum] = String(questions[key] || '').trim();
      }
    });
    saveState(appState);
    return res.json({
      success: true,
      classId,
      questions: appState.classSessionQuestions[classId],
      message: "학급의 차시별 질문이 성공적으로 일괄 저장되었습니다."
    });
  }

  return res.status(400).json({ success: false, message: "유효하지 않은 질문 데이터입니다." });
});

// 3-5. Save student answer to teacher question
app.post("/api/classes/:classId/students/:studentId/answer", (req, res) => {
  const { classId, studentId } = req.params;
  const { answer } = req.body;

  const student = appState.students.find(s => s.id === studentId);
  if (!student) {
    return res.status(404).json({ success: false, message: "학생 정보를 찾을 수 없습니다." });
  }

  if (!appState.studentAnswers) {
    appState.studentAnswers = {};
  }

  const answerKey = `${classId}_${studentId}`;
  const cleanAnswer = (answer || "").trim();

  appState.studentAnswers[answerKey] = {
    id: `ans-${classId}-${studentId}`,
    classId,
    studentId,
    studentName: student.name,
    studentNumber: student.number,
    answer: cleanAnswer,
    updatedAt: Date.now()
  };

  saveState(appState);

  res.json({
    success: true,
    data: appState.studentAnswers[answerKey],
    message: "선생님의 질문에 대한 답변이 안전하게 저장되었습니다!"
  });
});

// 4. Bulk upload students (Excel paste support for a single class)
app.post("/api/students/bulk", (req, res) => {
  const { classId, rawText, mode } = req.body; // mode: 'replace' | 'append'
  if (!classId) {
    return res.status(400).json({ success: false, message: "학급을 지정해야 합니다." });
  }

  // Parse lines: e.g. "1 홍길동" or "1\t김철수" or "1, 이영희" or "박서준"
  const lines = (rawText || "").split("\n").map((l: string) => l.trim()).filter(Boolean);
  const parsedStudents: Student[] = [];

  let autoNum = 1;
  for (const line of lines) {
    // Split by tab, comma, or space
    const parts = line.split(/[\t,]+/).map((s: string) => s.trim()).filter(Boolean);
    let num = autoNum;
    let name = "";

    if (parts.length >= 2) {
      const parsedNum = parseInt(parts[0], 10);
      if (!isNaN(parsedNum)) {
        num = parsedNum;
        name = parts[1];
      } else {
        name = parts.join(" ");
      }
    } else {
      // Single token or space-separated e.g. "1 강민준"
      const spaceParts = line.split(/\s+/);
      if (spaceParts.length >= 2 && !isNaN(parseInt(spaceParts[0], 10))) {
        num = parseInt(spaceParts[0], 10);
        name = spaceParts.slice(1).join(" ");
      } else {
        name = line;
      }
    }

    if (name) {
      parsedStudents.push({
        id: `c${classId}-${num}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        classId,
        number: num,
        name
      });
      autoNum = Math.max(autoNum, num) + 1;
    }
  }

  if (parsedStudents.length === 0) {
    return res.status(400).json({ success: false, message: "인식된 학생 명단이 없습니다. 형식: '번호 이름' 또는 엑셀 복사-붙여넣기" });
  }

  if (mode === "replace") {
    appState.students = appState.students.filter(s => s.classId !== classId).concat(parsedStudents);
  } else {
    appState.students = appState.students.concat(parsedStudents);
  }

  // Sort students by number
  appState.students.sort((a, b) => {
    if (a.classId === b.classId) return a.number - b.number;
    return a.classId.localeCompare(b.classId);
  });

  saveState(appState);

  res.json({
    success: true,
    addedCount: parsedStudents.length,
    students: appState.students.filter(s => s.classId === classId)
  });
});

// 4-1. Bulk upload students across ALL classes (1~11반) at once
app.post("/api/students/bulk-all-classes", (req, res) => {
  const { rawText, mode } = req.body; // mode: 'replace-all' | 'append'
  if (!rawText || typeof rawText !== "string") {
    return res.status(400).json({ success: false, message: "명렬표 내용을 입력해주세요." });
  }

  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  const parsedStudents: Student[] = [];
  let unparsedCount = 0;

  for (const line of lines) {
    // Split by tab, comma, or whitespace
    const parts = line.split(/[\t,]+/).map(s => s.trim()).filter(Boolean);
    let classPart = "";
    let numPart = 0;
    let namePart = "";

    if (parts.length >= 3) {
      classPart = parts[0];
      numPart = parseInt(parts[1], 10);
      namePart = parts.slice(2).join(" ");
    } else {
      const spaceParts = line.split(/\s+/).filter(Boolean);
      if (spaceParts.length >= 3) {
        classPart = spaceParts[0];
        numPart = parseInt(spaceParts[1], 10);
        namePart = spaceParts.slice(2).join(" ");
      } else {
        unparsedCount++;
        continue;
      }
    }

    // Normalize class ID: e.g. "3-1", "1", "1반", "3학년 1반", "3-01", etc.
    const classNumMatch = classPart.match(/(\d+)\s*반|3\s*-\s*(\d+)|^(\d+)$/);
    let classNum = 0;
    if (classNumMatch) {
      classNum = parseInt(classNumMatch[1] || classNumMatch[2] || classNumMatch[3], 10);
    }
    if (isNaN(classNum) || classNum < 1 || classNum > 20) {
      unparsedCount++;
      continue;
    }

    const targetClassId = `3-${classNum}`;
    let targetClass = appState.classes.find(c => c.id === targetClassId);
    if (!targetClass) {
      targetClass = { id: targetClassId, name: `3학년 ${classNum}반` };
      appState.classes.push(targetClass);
      appState.classes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    }

    const finalNum = isNaN(numPart) ? 1 : numPart;
    if (namePart) {
      parsedStudents.push({
        id: `c${targetClassId}-${finalNum}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        classId: targetClassId,
        number: finalNum,
        name: namePart.trim()
      });
    }
  }

  if (parsedStudents.length === 0) {
    return res.status(400).json({
      success: false,
      message: "인식된 학생 명단이 없습니다. 형식: [학급 번호 이름] 예: '1 1 강민준' 또는 '3-1 1 강민준'"
    });
  }

  if (mode === 'replace-all') {
    const touchedClassIds = new Set(parsedStudents.map(s => s.classId));
    appState.students = appState.students.filter(s => !touchedClassIds.has(s.classId)).concat(parsedStudents);
  } else {
    appState.students = appState.students.concat(parsedStudents);
  }

  appState.students.sort((a, b) => {
    if (a.classId === b.classId) return a.number - b.number;
    return a.classId.localeCompare(b.classId, undefined, { numeric: true });
  });

  saveState(appState);

  res.json({
    success: true,
    addedCount: parsedStudents.length,
    totalStudents: appState.students.length,
    unparsedCount,
    message: `총 ${parsedStudents.length}명의 학생 명단이 성공적으로 등록되었습니다.`
  });
});

// 4-2. Add single student
app.post("/api/students", (req, res) => {
  const { classId, number, name } = req.body;
  if (!classId || !name) {
    return res.status(400).json({ success: false, message: "학급과 학생 이름을 입력해야 합니다." });
  }

  const studentNum = parseInt(number, 10) || 1;
  const newStudent: Student = {
    id: `c${classId}-${studentNum}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    classId,
    number: studentNum,
    name: name.trim()
  };

  appState.students.push(newStudent);
  appState.students.sort((a, b) => {
    if (a.classId === b.classId) return a.number - b.number;
    return a.classId.localeCompare(b.classId);
  });

  saveState(appState);

  res.json({ success: true, student: newStudent });
});

// 4-3. Delete single student
app.delete("/api/students/:id", (req, res) => {
  const { id } = req.params;
  appState.students = appState.students.filter(s => s.id !== id);
  saveState(appState);
  res.json({ success: true, deletedId: id });
});

// 5. Submit feedback (Observer or Teacher) - Create or Update
app.post("/api/feedback", (req, res) => {
  const {
    id,
    feedbackId,
    classId,
    performerId,
    performerName,
    observerId,
    observerName,
    observerNumber,
    isTeacher,
    shotType,
    stars,
    criteriaResults,
    comment,
    session
  } = req.body;

  const targetId = feedbackId || id;
  const parsedSession = Math.max(1, Number(session) || 1);

  // 1) Explicit update by ID if provided
  if (targetId) {
    const existing = appState.feedbacks.find(f => f.id === targetId);
    if (existing) {
      if (stars !== undefined) existing.stars = Math.min(3, Math.max(1, Number(stars) || 1));
      if (criteriaResults !== undefined) existing.criteriaResults = criteriaResults;
      if (comment !== undefined) existing.comment = String(comment).trim();
      if (shotType !== undefined) existing.shotType = shotType === "layup" ? "layup" : "middle";
      if (session !== undefined) existing.session = parsedSession;
      existing.updatedAt = Date.now();
      saveState(appState);
      return res.json({
        success: true,
        feedback: existing,
        isUpdate: true,
        message: `${existing.session || parsedSession}차시 피드백이 성공적으로 수정되었습니다.`
      });
    }
  }

  if (!performerId || !observerName || !shotType || !stars) {
    return res.status(400).json({ success: false, message: "필수 정보가 누락되었습니다." });
  }

  // 2) Check if feedback already exists for this (classId, performerId, observerId, shotType, session)
  // If exists, update it instead of rejecting or duplicating!
  const existingSameSession = appState.feedbacks.find(f =>
    f.classId === classId &&
    f.performerId === performerId &&
    f.observerId === (observerId || "unknown") &&
    f.shotType === (shotType === "layup" ? "layup" : "middle") &&
    (f.session || 1) === parsedSession
  );

  if (existingSameSession) {
    existingSameSession.stars = Math.min(3, Math.max(1, Number(stars) || 1));
    existingSameSession.criteriaResults = criteriaResults || {};
    existingSameSession.comment = (comment || "").trim();
    existingSameSession.updatedAt = Date.now();
    saveState(appState);
    return res.json({
      success: true,
      feedback: existingSameSession,
      isUpdate: true,
      message: `${parsedSession}차시 피드백이 성공적으로 수정되었습니다.`
    });
  }

  // 3) Create new feedback item for this session
  const newFeedback: FeedbackItem = {
    id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    classId,
    performerId,
    performerName,
    observerId: observerId || "unknown",
    observerName: observerName.trim(),
    ...(observerNumber !== undefined && !isNaN(Number(observerNumber)) ? { observerNumber: Number(observerNumber) } : {}),
    isTeacher: Boolean(isTeacher),
    shotType: shotType === "layup" ? "layup" : "middle",
    stars: Math.min(3, Math.max(1, Number(stars) || 1)),
    criteriaResults: criteriaResults || {},
    comment: (comment || "").trim(),
    session: parsedSession,
    timestamp: Date.now(),
    favoriteRewarded: false
  };

  appState.feedbacks.unshift(newFeedback);
  saveState(appState);

  res.json({
    success: true,
    feedback: newFeedback,
    isUpdate: false,
    message: `${parsedSession}차시 피드백이 등록되었습니다.`
  });
});

// 5-1. Explicit PUT for editing feedback
app.put("/api/feedback/:id", (req, res) => {
  const { id } = req.params;
  const { stars, criteriaResults, comment, shotType, session } = req.body;
  const target = appState.feedbacks.find(f => f.id === id);

  if (!target) {
    return res.status(404).json({ success: false, message: "수정할 피드백을 찾을 수 없습니다." });
  }

  if (stars !== undefined) target.stars = Math.min(3, Math.max(1, Number(stars) || 1));
  if (criteriaResults !== undefined) target.criteriaResults = criteriaResults;
  if (comment !== undefined) target.comment = String(comment).trim();
  if (shotType !== undefined) target.shotType = shotType === "layup" ? "layup" : "middle";
  if (session !== undefined) target.session = Math.max(1, Number(session) || 1);
  target.updatedAt = Date.now();
  saveState(appState);

  res.json({
    success: true,
    feedback: target,
    isUpdate: true,
    message: `${target.session || 1}차시 피드백이 수정되었습니다.`
  });
});

// 5-2. Set active session for a class
app.post("/api/classes/:classId/active-session", (req, res) => {
  const { classId } = req.params;
  const { session } = req.body;
  const parsedSession = Number(session) === 0 ? 0 : Math.max(1, Number(session) || 1);

  if (!appState.activeSessions) {
    appState.activeSessions = {};
  }
  appState.activeSessions[classId] = parsedSession;
  saveState(appState);

  res.json({
    success: true,
    activeSessions: appState.activeSessions,
    message: parsedSession === 0 ? '전체 차시 보기로 설정되었습니다.' : `${parsedSession}차시로 설정되었습니다.`
  });
});

// 5-3. Batch set active session for all or multiple classes
app.post("/api/classes/batch-active-session", (req, res) => {
  const { session, classIds } = req.body;
  const parsedSession = Number(session) === 0 ? 0 : Math.max(1, Number(session) || 1);

  if (!appState.activeSessions) {
    appState.activeSessions = {};
  }

  const targetIds: string[] = Array.isArray(classIds) && classIds.length > 0
    ? classIds
    : appState.classes.map(c => c.id);

  targetIds.forEach(cId => {
    appState.activeSessions![cId] = parsedSession;
  });

  saveState(appState);

  res.json({
    success: true,
    activeSessions: appState.activeSessions,
    message: parsedSession === 0
      ? `전체 ${targetIds.length}개 학급이 [전체 차시 보기]로 일괄 설정되었습니다.`
      : `전체 ${targetIds.length}개 학급이 [${parsedSession}차시]로 일괄 설정되었습니다.`
  });
});

// 6. Reward 1 star back to an observer for good feedback
app.post("/api/feedback/:id/reward", (req, res) => {
  const { id } = req.params;
  const target = appState.feedbacks.find(f => f.id === id);

  if (!target) {
    return res.status(404).json({ success: false, message: "해당 피드백을 찾을 수 없습니다." });
  }

  if (target.favoriteRewarded) {
    return res.status(400).json({ success: false, message: "이미 보답 별을 보낸 피드백입니다." });
  }

  target.favoriteRewarded = true;
  target.favoriteRewardedAt = Date.now();
  saveState(appState);

  res.json({
    success: true,
    feedback: target,
    message: `${target.observerName} 친구에게 감사의 별(1개)을 전달했습니다!`
  });
});

// 6-0. Cancel rewarded star back to an observer (보답 별 취소)
app.post("/api/feedback/:id/cancel-reward", (req, res) => {
  const { id } = req.params;
  const target = appState.feedbacks.find(f => f.id === id);

  if (!target) {
    return res.status(404).json({ success: false, message: "해당 피드백을 찾을 수 없습니다." });
  }

  if (!target.favoriteRewarded) {
    return res.status(400).json({ success: false, message: "보답 별이 전달되지 않은 피드백입니다." });
  }

  target.favoriteRewarded = false;
  delete target.favoriteRewardedAt;
  saveState(appState);

  res.json({
    success: true,
    feedback: target,
    message: `${target.observerName} 친구에게 보낸 보답 별을 취소했습니다.`
  });
});

app.delete("/api/feedback/:id/reward", (req, res) => {
  const { id } = req.params;
  const target = appState.feedbacks.find(f => f.id === id);

  if (!target) {
    return res.status(404).json({ success: false, message: "해당 피드백을 찾을 수 없습니다." });
  }

  if (!target.favoriteRewarded) {
    return res.status(400).json({ success: false, message: "보답 별이 전달되지 않은 피드백입니다." });
  }

  target.favoriteRewarded = false;
  delete target.favoriteRewardedAt;
  saveState(appState);

  res.json({
    success: true,
    feedback: target,
    message: `${target.observerName} 친구에게 보낸 보답 별을 취소했습니다.`
  });
});

// 6-1. Delete single feedback
app.delete("/api/feedback/:id", (req, res) => {
  const { id } = req.params;
  const prevCount = appState.feedbacks.length;
  appState.feedbacks = appState.feedbacks.filter(f => f.id !== id);

  if (appState.feedbacks.length === prevCount) {
    return res.status(404).json({ success: false, message: "해당 피드백을 찾을 수 없습니다." });
  }

  saveState(appState);

  res.json({
    success: true,
    message: "피드백이 삭제되었습니다.",
    deletedId: id
  });
});

// 6-2. Granular clear feedbacks (by class, shotType, studentId, session, etc.)
app.post("/api/feedback/clear", (req, res) => {
  const {
    classId,
    shotType = 'all',
    studentId,
    session = 'all',
    clearAiEvaluations = true
  } = req.body || {};

  const isAllClasses = !classId || classId === 'all';
  const isAllShots = !shotType || shotType === 'all';
  const isAllStudents = !studentId || studentId === 'all';
  const isAllSessions = !session || session === 'all';

  const toRemove = appState.feedbacks.filter(f => {
    if (!isAllClasses && f.classId !== classId) return false;
    if (!isAllShots && f.shotType !== shotType) return false;
    if (!isAllStudents && f.performerId !== studentId && f.observerId !== studentId) return false;
    if (!isAllSessions && (f.session || 1) !== Number(session)) return false;
    return true;
  });

  const removedIds = new Set(toRemove.map(f => f.id));
  appState.feedbacks = appState.feedbacks.filter(f => !removedIds.has(f.id));

  const deletedCount = toRemove.length;
  const deletedStars = toRemove.reduce((sum, f) => sum + (Number(f.stars) || 0) + (f.favoriteRewarded ? 1 : 0), 0);

  // Clear or prune AI evaluation cache
  if (clearAiEvaluations && appState.aiEvaluations) {
    if (isAllClasses && isAllShots && isAllStudents) {
      appState.aiEvaluations = {};
    } else {
      // Prune only matching AI evaluations
      // Cache key format is `${performerId}_${shotType}`
      const currentEvals = appState.aiEvaluations;
      Object.keys(currentEvals).forEach(cacheKey => {
        const [pId, sType] = cacheKey.split('_');
        const matchesClass = isAllClasses || (appState.students.find(s => s.id === pId)?.classId === classId);
        const matchesShot = isAllShots || sType === shotType;
        const matchesStudent = isAllStudents || pId === studentId;
        if (matchesClass && matchesShot && matchesStudent) {
          delete currentEvals[cacheKey];
        }
      });
    }
  }

  saveState(appState);

  const className = isAllClasses ? "전체 학급" : (appState.classes.find(c => c.id === classId)?.name || classId);
  const shotLabel = isAllShots ? "모든 슛" : (shotType === "middle" ? "미들슛" : "레이업슛");

  res.json({
    success: true,
    message: `${className}의 ${shotLabel} 피드백 ${deletedCount}건과 별점(${deletedStars}개)이 성공적으로 초기화되었습니다.`,
    deletedCount,
    deletedStars,
    feedbacks: appState.feedbacks
  });
});

// Helper: Deterministic Biomechanical Analysis Fallback (Zero-downtime guarantee)
function synthesizeDeterministicBiomechanicalEvaluation(
  performerId: string,
  performerName: string,
  validShotType: "middle" | "layup",
  targetFeedbacks: FeedbackItem[]
): AiEvaluation {
  const criteriaList = validShotType === "middle" ? MIDDLE_SHOT_CRITERIA : LAYUP_SHOT_CRITERIA;
  const shotTypeName = validShotType === "middle" ? "미들슛" : "레이업슛";

  const criteriaAnalysis = criteriaList.map(c => {
    let goodCount = 0;
    let badCount = 0;
    targetFeedbacks.forEach(fb => {
      const res = fb.criteriaResults ? fb.criteriaResults[c.id] : undefined;
      if (res === "good") goodCount++;
      else if (res === "bad") badCount++;
    });

    const isGood = goodCount >= badCount;
    let detail = "";
    if (validShotType === "middle") {
      if (c.id === 1) {
        detail = isGood
          ? `관찰 평가(${goodCount}명 긍정) 결과, 양발을 어깨너비로 균형 있게 유지하고 발끝을 림 방향으로 정렬하여 수직 도약에 적합한 기저면을 안정적으로 확보했습니다.`
          : `관찰 평가(${badCount}명 지적) 결과, 도약 전 양발의 균형이 불규칙하거나 발끝 정렬이 흔들려 하체 지면반력의 효율적 전달에 보완이 필요합니다.`;
      } else if (c.id === 2) {
        detail = isGood
          ? `팔꿈치-어깨-손목의 BEEF 정렬이 림과 수직을 이루었으며, 보조손의 간섭 없이 안정적인 슈팅 포켓에서 릴리스가 이루어졌습니다.`
          : `팔꿈치가 바깥쪽으로 벌어지거나 보조손이 공을 밀어내어 슛 포물선의 좌우 편차가 발생하므로 팔꿈치 각도와 보조손 분리 교정이 필요합니다.`;
      } else if (c.id === 3) {
        detail = isGood
          ? `신체 중심이 전후좌우로 쏠리지 않고 수직으로 도약하였으며, 점프의 최고 정점 직전 이상적인 타이밍에 힘을 실어 공을 방출했습니다.`
          : `도약 시 전방이나 측면으로 쏠림이 있거나 점프 하강 국면에서 릴리스하여 지면반력 탄성에너지를 슛 추진력으로 온전히 전환하지 못했습니다.`;
      } else {
        detail = isGood
          ? `릴리스 후 손목 스냅이 림을 향해 부드럽게 유지(Follow-through)되었으며, 공에 깨끗한 백스핀이 형성되어 득점 성공률을 높였습니다.`
          : `슛 릴리스 직후 손목을 바로 거두거나 손끝 방향이 틀어져 공의 역회전 궤적이 일정하지 않으므로 팔로우스루 자세 유지가 필요합니다.`;
      }
    } else {
      if (c.id === 1) {
        detail = isGood
          ? `도움닫기 후 규정된 1-2 스텝(길게 하나, 힘차게 둘) 보폭 리듬을 정확히 구사하여 도약 위치를 흔들림 없이 확보했습니다.`
          : `드리블 캐치 후 1-2 스텝의 보폭과 박자가 맞지 않거나 발 디딤이 엉켜 수직 도약으로 매끄럽게 연결되지 못했습니다.`;
      } else if (c.id === 2) {
        detail = isGood
          ? `골밑 진입 각도에 맞춰 백보드 사각형 상단 모서리 타겟을 정확히 겨냥하여 공의 충돌 에너지를 감쇠시키며 안정적으로 득점했습니다.`
          : `릴리스 순간 손목 감각이 과도하게 강하거나 시선 처리가 불안정하여 백보드 겨냥점을 빗겨 맞는 현상이 관찰되었습니다.`;
      } else if (c.id === 3) {
        detail = isGood
          ? `도약 시 디딤발 반대쪽 무릎(자유족)을 가슴 높이까지 90도 이상 힘차게 끌어올려 공중 체공시간과 수직 추진력을 훌륭하게 극대화했습니다.`
          : `점프 시 무릎을 충분히 들어 올리지 못해 전방으로 몸이 쏠려 골대와 충돌 위험이 있고 충분한 체공 높이를 얻지 못했습니다.`;
      } else {
        detail = isGood
          ? `드리블 감속 없이 공을 캐치한 뒤 점프와 릴리스까지 하나의 유기적인 흐름으로 끊김 없이 유려하게 완성했습니다.`
          : `공을 잡는 순간 속도가 급격히 줄어들거나 도약 직전 주저함이 발생하여 슛 동작의 운동학적 연속성이 단절되었습니다.`;
      }
    }

    return {
      criterionId: c.id,
      criterionTitle: c.shortName,
      status: (isGood ? "잘함" : "보완필요") as "잘함" | "보완필요",
      detail
    };
  });

  const goodCriteria = criteriaAnalysis.filter(c => c.status === "잘함");
  const badCriteria = criteriaAnalysis.filter(c => c.status === "보완필요");
  const avgStars = targetFeedbacks.reduce((sum, f) => sum + (f.stars || 1), 0) / (targetFeedbacks.length || 1);

  let overallGrade: "우수" | "보통" | "노력요함" = "보통";
  if (goodCriteria.length >= 3 && avgStars >= 2.2) {
    overallGrade = "우수";
  } else if (goodCriteria.length <= 1 || avgStars < 1.6) {
    overallGrade = "노력요함";
  }

  const strengths = goodCriteria.map(c => {
    const orig = criteriaList.find(x => x.id === c.criterionId);
    return `[${c.criterionTitle}] ${orig?.focusArea || ''} - 동료 및 지도교사 관찰에서 일관되게 높은 안정성을 보임`;
  });
  if (strengths.length === 0) {
    strengths.push("동작 수행에 대한 적극적인 도전 의지와 동료 피드백을 수용하여 교정하려는 실천적 학습 태도");
  }

  const weaknesses = badCriteria.map(c => {
    const orig = criteriaList.find(x => x.id === c.criterionId);
    return `[${c.criterionTitle}] ${orig?.commonMistake || ''} - 분절 협응 및 동작 궤적의 일관성 보완 필요`;
  });
  if (weaknesses.length === 0) {
    weaknesses.push("현재 기본 동작이 매우 양호하므로 경기 실전 상황(수비수 압박, 다양한 거리 및 각도)에서의 성공률 제고 훈련 권장");
  }

  let actionTips: string[] = [];
  if (validShotType === "middle") {
    actionTips = [
      "BEEF 폼 고정 슈팅: 골대 앞 2~3m 거리에서 원핸드로 팔꿈치 90도와 손목 스냅 각도를 의식하며 연속 10개 클린샷 연습",
      "트리플 익스텐션(발목-무릎-골반) 지면반력 연계: 하체 굴곡 후 점프 반동을 릴리스 순간까지 끊김 없이 연결하는 리듬 체화",
      "벽면 스냅 앤 백스핀 드릴: 벽을 바라보고 공을 수직으로 띄워 손가락 끝(핑거팁)을 통한 깨끗한 역회전 확인"
    ];
  } else {
    actionTips = [
      "노볼(No-Ball) 1-2 스텝 드릴: 공 없이 어프로치 라인에서 '하나(길게)-둘(힘차게 도약)' 리듬을 구두로 외치며 20회 반복 체화",
      "마이칸 드릴(Mikan Drill): 골대 바로 아래 좌우에서 한 발 점프로 백보드 사각형 상단 모서리를 맞춰 부드럽게 넣는 연습",
      "무릎 리프트 수직 점프: 런닝 후 반대쪽 무릎을 가슴 높이로 90도 이상 폭발적으로 차올리는 수직 도약 점프 훈련"
    ];
  }

  const summary = `${performerName} 학생의 ${shotTypeName} 수행에 대한 동료 및 교사 피드백 ${targetFeedbacks.length}건을 정밀 종합 분석한 결과입니다. 전반적으로 ${goodCriteria.length > 0 ? goodCriteria.map(c => c.criterionTitle).join(", ") + " 부문에서 좋은 신체 협응을 보였으나, " : ""}${badCriteria.length > 0 ? badCriteria.map(c => c.criterionTitle).join(", ") + " 부문의 역학적 교정이 병행되어야 합니다." : "모든 핵심 평가 기준을 높은 수준으로 충족하고 있습니다."} 제시된 맞춤형 드릴을 바탕으로 다음 체육 시간에 집중 연습해보세요.`;

  return {
    performerId,
    shotType: validShotType,
    overallGrade,
    summary,
    strengths,
    weaknesses,
    actionTips,
    criteriaAnalysis,
    generatedAt: Date.now()
  };
}

// 7. Ask Gemini for comprehensive evaluation (Multi-tier model cascade + Deterministic Fallback)
app.post("/api/ai-feedback", async (req, res) => {
  const { performerId, performerName, shotType } = req.body;

  if (!performerId || !shotType) {
    return res.status(400).json({ success: false, message: "수행자와 슛 유형이 필요합니다." });
  }

  const validShotType = shotType === "layup" ? "layup" : "middle";
  const criteriaList = validShotType === "middle" ? MIDDLE_SHOT_CRITERIA : LAYUP_SHOT_CRITERIA;
  const shotTypeName = validShotType === "middle" ? "미들슛" : "레이업슛";

  // Filter feedbacks for this performer and shot type
  const targetFeedbacks = appState.feedbacks.filter(
    f => f.performerId === performerId && f.shotType === validShotType
  );

  if (targetFeedbacks.length === 0) {
    return res.status(400).json({
      success: false,
      message: "아직 등록된 친구나 선생님의 관찰 피드백이 없습니다. 먼저 관찰자 모드에서 피드백을 받아보세요!"
    });
  }

  // Construct rigorous prompt
  const criteriaPromptSection = criteriaList.map(c => `[기준 ${c.id}] ${c.text}\n - 집중요소: ${c.focusArea}\n - 흔한 오류: ${c.commonMistake}`).join("\n\n");

  const feedbacksSummary = targetFeedbacks.map((f, i) => {
    const criteriaDetails = Object.entries(f.criteriaResults)
      .map(([critId, val]) => {
        const cObj = criteriaList.find(c => c.id === Number(critId));
        const statusStr = val === "good" ? "성공(잘함)" : val === "bad" ? "미흡(보완필요)" : "미확인";
        return `기준 ${critId}(${cObj ? cObj.shortName : ""}): ${statusStr}`;
      })
      .join(", ");

    return `${i + 1}. [${f.isTeacher ? "선생님" : "동료 " + f.observerName}] 별점: ${f.stars}개 / 평가항목: [${criteriaDetails}] / 피드백 내용: "${f.comment}"`;
  }).join("\n");

  const systemInstruction = `당신은 대한민국 중·고등학교 체육과 교육과정 전문 농구 지도교사 및 생체역학 코치 'AI 별빛 코치'입니다.
절대적 원칙:
1. 무조건적인 칭찬이나 피상적인 감언이설은 금지됩니다. 학생의 실질적인 자세 교정과 운동학적 발달을 위해 엄격하고 객관적인 피드백을 제공해야 합니다.
2. 관찰자(동료 학생 및 교사)들이 기록한 체크리스트와 코멘트를 종합하여, 공통적으로 지적된 부족한 점과 잘된 점을 공식 평가기준 4가지와 1:1로 매핑하여 명확하게 판정하십시오.
3. 잘한 부분은 어떤 생체역학적 원리로 잘 이루어졌는지 명시하고, 미흡하거나 아쉬운 부분은 신체 분절의 잘못된 각도, 타이밍, 힘 전달의 단절 등 구체적인 원인과 함께 교정 방법을 지적해야 합니다.`;

  const userPrompt = `[학생 정보]
- 이름: ${performerName || "수행자"}
- 시연 종목: ${shotTypeName}

[공식 평가기준 - ${shotTypeName}]
${criteriaPromptSection}

[수집된 동료 및 교사 관찰 피드백 (${targetFeedbacks.length}건)]
${feedbacksSummary}

위 피드백들을 정밀 분석하여 JSON 형식으로 응답해주세요. 무조건 좋게만 쓰지 말고, 부족한 동작은 단호하고 친절하게 지적하며 구체적인 드릴(연습법)을 제시해주세요.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      overallGrade: {
        type: Type.STRING,
        description: "'우수', '보통', '노력요함' 중 하나"
      },
      summary: {
        type: Type.STRING,
        description: "피드백을 종합한 객관적이고 솔직한 총평 2~3문장"
      },
      strengths: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "명확하게 잘 수행된 자세 포인트 목록 (근거 포함)"
      },
      weaknesses: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "반드시 고쳐야 할 아쉬운 동작 및 자세 오류 목록"
      },
      actionTips: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "다음 체육 시간 또는 자율 연습 시 적용할 1포인트 교정 팁 2~3개"
      },
      criteriaAnalysis: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            criterionId: { type: Type.INTEGER },
            criterionTitle: { type: Type.STRING },
            status: { type: Type.STRING, description: "'잘함', '보완필요', '판단보류' 중 하나" },
            detail: { type: Type.STRING, description: "동료들의 관찰 기록에 기반한 객관적 판정 이유" }
          },
          required: ["criterionId", "criterionTitle", "status", "detail"]
        }
      }
    },
    required: ["overallGrade", "summary", "strengths", "weaknesses", "actionTips", "criteriaAnalysis"]
  };

  // Candidate models: prioritize fast & reliable models with automatic fallback
  const CANDIDATE_MODELS = [
    "gemini-3.1-flash-lite", // Fast, resilient, high-availability
    "gemini-3.8-flash",      // Deep flash model
    "gemini-flash-latest"    // General flash latest
  ];

  let evaluationResult: AiEvaluation | null = null;
  const ai = getGeminiClient();

  for (const modelName of CANDIDATE_MODELS) {
    try {
      console.log(`[AI Evaluation] Trying model: ${modelName} for ${performerName} (${shotTypeName})`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema
        }
      });

      if (response && response.text) {
        const parsedJson = JSON.parse(response.text);
        if (parsedJson && parsedJson.summary) {
          evaluationResult = {
            performerId,
            shotType: validShotType,
            overallGrade: (["우수", "보통", "노력요함"].includes(parsedJson.overallGrade) ? parsedJson.overallGrade : "보통") as any,
            summary: parsedJson.summary || "동료 피드백 종합 분석 결과입니다.",
            strengths: Array.isArray(parsedJson.strengths) ? parsedJson.strengths : [],
            weaknesses: Array.isArray(parsedJson.weaknesses) ? parsedJson.weaknesses : [],
            actionTips: Array.isArray(parsedJson.actionTips) ? parsedJson.actionTips : [],
            criteriaAnalysis: Array.isArray(parsedJson.criteriaAnalysis) ? parsedJson.criteriaAnalysis : [],
            generatedAt: Date.now()
          };
          console.log(`[AI Evaluation] Successfully generated via model ${modelName}`);
          break;
        }
      }
    } catch (err: any) {
      console.warn(`[AI Evaluation] Model ${modelName} failed (${err?.status || err?.message?.slice(0, 60)}). Checking next fallback...`);
    }
  }

  // 100% Zero-failure guarantee: If all external Gemini endpoints fail or timeout, use deterministic biomechanical synthesis
  if (!evaluationResult) {
    console.warn(`[AI Evaluation] All Gemini models unavailable. Activating deterministic biomechanical synthesis engine.`);
    evaluationResult = synthesizeDeterministicBiomechanicalEvaluation(
      performerId,
      performerName || "수행자",
      validShotType,
      targetFeedbacks
    );
  }

  const cacheKey = `${performerId}_${validShotType}`;
  appState.aiEvaluations[cacheKey] = evaluationResult;
  saveState(appState);

  return res.json({
    success: true,
    evaluation: evaluationResult
  });
});


// 8. Reset data endpoint
app.post("/api/reset", (_req, res) => {
  appState = getInitialData();
  saveState(appState);
  res.json({ success: true, message: "초기 데이터로 재설정되었습니다.", data: appState });
});

// 9. Import full state / roster backup
app.post("/api/state/import", (req, res) => {
  const { classes, students, feedbacks } = req.body || {};
  if (!Array.isArray(classes) || !Array.isArray(students)) {
    return res.status(400).json({ success: false, message: "올바른 명렬표 데이터 형식이 아닙니다." });
  }

  appState.classes = classes;
  appState.students = students;
  if (Array.isArray(feedbacks)) {
    appState.feedbacks = feedbacks;
  }
  saveState(appState);

  res.json({
    success: true,
    message: `학급 ${classes.length}개, 학생 ${students.length}명 데이터를 성공적으로 복원했습니다.`,
    data: appState
  });
});

// 10. Export full state backup
app.get("/api/state/export", (_req, res) => {
  res.setHeader("Content-Disposition", `attachment; filename="shooting_star_backup_${Date.now()}.json"`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(appState, null, 2));
});

// ================= GAME MODE (별빛 버저비터) API ROUTES =================

// Get game leaderboard scores (All students sorted by score, no class distinction)
app.get("/api/game/scores", (_req, res) => {
  const scores = (appState.gameScores || []).slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.madeShots !== a.madeShots) return b.madeShots - a.madeShots;
    if (b.perfectCount !== a.perfectCount) return b.perfectCount - a.perfectCount;
    return a.timestamp - b.timestamp;
  });

  res.json({
    success: true,
    scores,
    totalRecords: scores.length
  });
});

// Submit a new game score
app.post("/api/game/scores", (req, res) => {
  const {
    studentId,
    studentName,
    studentNumber,
    classId,
    className,
    score,
    totalShots,
    madeShots,
    perfectCount,
    maxCombo,
    shotTypesBreakdown
  } = req.body;

  if (!studentName || typeof score !== "number") {
    return res.status(400).json({ success: false, message: "학생 이름과 점수가 필요합니다." });
  }

  const newScoreItem: GameScoreItem = {
    id: `game-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    studentId: studentId || undefined,
    studentName: String(studentName).trim(),
    studentNumber: typeof studentNumber === "number" ? studentNumber : undefined,
    classId: classId || undefined,
    className: className || undefined,
    score: Math.max(0, Math.round(score)),
    totalShots: Math.max(0, Number(totalShots) || 0),
    madeShots: Math.max(0, Number(madeShots) || 0),
    perfectCount: Math.max(0, Number(perfectCount) || 0),
    maxCombo: Math.max(0, Number(maxCombo) || 0),
    shotTypesBreakdown: shotTypesBreakdown || undefined,
    timestamp: Date.now()
  };

  if (!appState.gameScores) {
    appState.gameScores = [];
  }

  appState.gameScores.push(newScoreItem);
  saveState(appState);

  // Return the ranking position of this new score
  const allSorted = appState.gameScores.slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.madeShots !== a.madeShots) return b.madeShots - a.madeShots;
    return a.timestamp - b.timestamp;
  });
  const rank = allSorted.findIndex(s => s.id === newScoreItem.id) + 1;

  res.json({
    success: true,
    item: newScoreItem,
    rank,
    totalRecords: allSorted.length,
    message: `${newScoreItem.studentName} 학생의 점수(${newScoreItem.score}점, 전교 ${rank}위)가 명예의 전당에 등록되었습니다!`
  });
});

// Delete a game score
app.delete("/api/game/scores/:id", (req, res) => {
  const { id } = req.params;
  if (!appState.gameScores) {
    return res.status(404).json({ success: false, message: "점수 기록이 없습니다." });
  }

  const initialLen = appState.gameScores.length;
  appState.gameScores = appState.gameScores.filter(s => s.id !== id);

  if (appState.gameScores.length === initialLen) {
    return res.status(404).json({ success: false, message: "삭제할 점수 기록을 찾지 못했습니다." });
  }

  saveState(appState);
  res.json({ success: true, message: "기록이 삭제되었습니다." });
});

// Clear all game scores
app.delete("/api/game/scores", (_req, res) => {
  appState.gameScores = [];
  saveState(appState);
  res.json({ success: true, message: "모든 게임 랭킹 기록이 초기화되었습니다." });
});

// ================= VITE / PRODUCTION HANDLER =================
async function startServer() {
  // Sync state from Cloud Firestore if available
  try {
    const cloudState = await syncFromFirestore();
    if (cloudState && cloudState.classes && cloudState.students) {
      // Merge cloudState with existing loaded disk appState so teacherQuestions and sessionQuestions are NEVER lost
      appState = {
        classes: cloudState.classes && cloudState.classes.length > 0 ? cloudState.classes : appState.classes,
        students: cloudState.students && cloudState.students.length > 0 ? cloudState.students : appState.students,
        feedbacks: (cloudState.feedbacks && cloudState.feedbacks.length > 0) ? cloudState.feedbacks : (appState.feedbacks || []),
        aiEvaluations: { ...(appState.aiEvaluations || {}), ...(cloudState.aiEvaluations || {}) },
        teacherQuestions: { ...(appState.teacherQuestions || {}), ...(cloudState.teacherQuestions || {}) },
        sessionQuestions: {
          ...(appState.sessionQuestions || {}),
          ...(cloudState.sessionQuestions || {})
        },
        classSessionQuestions: {
          ...(appState.classSessionQuestions || {}),
          ...(cloudState.classSessionQuestions || {})
        },
        studentAnswers: { ...(appState.studentAnswers || {}), ...(cloudState.studentAnswers || {}) },
        activeSessions: { ...(appState.activeSessions || {}), ...(cloudState.activeSessions || {}) },
        gameScores: (cloudState.gameScores && cloudState.gameScores.length > 0) ? cloudState.gameScores : (appState.gameScores || [])
      };
      // Also cache to local disk
      saveState(appState);
      console.log(`[ShootingStar] Cloud Firestore merged into appState: ${appState.classes.length} classes, ${appState.students.length} students`);
    } else {
      saveState(appState);
    }
  } catch (err) {
    console.warn("[ShootingStar] Failed to sync from Cloud Firestore at startup:", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else if (filePath.includes('/assets/')) {
          // Vite hashed assets can be cached
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get("*", (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Shooting Star Basketball server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
