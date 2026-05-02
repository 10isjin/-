import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc,
  setDoc,
  updateDoc,
  increment,
  Timestamp,
  getDoc,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Run, UserProfile, GlobalStats, UserRole, ClassProfile } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useFirebase() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [topRunners, setTopRunners] = useState<UserProfile[]>([]);
  const [topClasses, setTopClasses] = useState<ClassProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = doc(db, 'users', user.uid);
        try {
          const snap = await getDoc(userDoc);
          if (snap.exists()) {
            setProfile({ id: snap.id, ...snap.data() } as UserProfile);
          } else {
            setProfile(null);
          }
        } catch (e) {
          console.error("Error fetching profile", e);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Global Stats Listener
  useEffect(() => {
    const statsDoc = doc(db, 'globalStats', 'current');
    const unsub = onSnapshot(statsDoc, (snap) => {
      if (snap.exists()) {
        setGlobalStats(snap.data() as GlobalStats);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'globalStats/current'));
    return unsub;
  }, []);

  // Recent Runs Listener
  useEffect(() => {
    const q = query(collection(db, 'runs'), orderBy('timestamp', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      const runs: Run[] = [];
      snap.forEach(doc => {
        runs.push({ id: doc.id, ...doc.data() } as Run);
      });
      setRecentRuns(runs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'runs'));
    return unsub;
  }, []);

  // Top Runners Listener
  useEffect(() => {
    // Fetch all users to allow full search capability
    const q = query(
      collection(db, 'users'), 
      orderBy('totalDistance', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const users: UserProfile[] = [];
      snap.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() } as UserProfile);
      });
      setTopRunners(users);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
    return unsub;
  }, []);

  // Top Classes Listener
  useEffect(() => {
    const q = query(collection(db, 'classes'), orderBy('totalDistance', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      const cls: ClassProfile[] = [];
      snap.forEach(doc => {
        const data = doc.data() as ClassProfile;
        // Strictly filter to Galmae Middle School structure: 1-14, 2-13, 3-11
        if (
          (data.grade === 1 && data.classNumber >= 1 && data.classNumber <= 14) ||
          (data.grade === 2 && data.classNumber >= 1 && data.classNumber <= 13) ||
          (data.grade === 3 && data.classNumber >= 1 && data.classNumber <= 14)
        ) {
          cls.push({ id: doc.id, ...data });
        }
      });
      setTopClasses(cls);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'classes'));
    return unsub;
  }, []);

  const getClassMembers = async (classId: string) => {
    try {
      const q = query(
        collection(db, 'users'), 
        where('classId', '==', classId)
      );
      const snap = await getDocs(q);
      // Sort by distance in memory for all users in the class
      return snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as UserProfile))
        .sort((a, b) => b.totalDistance - a.totalDistance);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${classId}`);
      return [];
    }
  };

  const bulkUpdateFromCSV = async (data: any[]) => {
    if (!user || user.email !== "yelloboll@goedu.kr") throw new Error("Unauthorized");
    
    const userUpdates: Record<string, { 
      displayName: string, 
      role: UserRole, 
      totalDistance: number, 
      runCount: number,
      classId: string | null,
      studentId: string | null
    }> = {};

    const classDataMap: Record<string, { 
      totalDistance: number, 
      participants: Set<string>, 
      grade: number, 
      classNumber: number 
    }> = {};

    let globalTotalDistance = 0;
    const globalParticipants = new Set<string>();

    try {
      for (const row of data) {
        // Robust column detection
        const keys = Object.keys(row);
        const nicknameKey = keys.find(k => k.includes('닉네임') || k.toLowerCase().includes('nickname')) || '';
        const nameKey = keys.find(k => k.includes('이름') || k.toLowerCase().includes('name')) || '';
        const idKey = keys.find(k => k.includes('ID') || k.includes('유저코드') || k.includes('UserId')) || '';
        const roleKey = keys.find(k => k.includes('소속') || k.includes('그룹') || k.includes('Affiliation')) || '';
        const distKey = keys.find(k => k.includes('거리') || k.toLowerCase().includes('dist')) || '';
        const countKey = keys.find(k => k.includes('횟수') || k.toLowerCase().includes('count')) || '';

        const nickname = (row[nicknameKey] || "").toString().trim();
        const realName = (row[nameKey] || "").toString().trim();
        
        // Use nickname as the primary display name as requested
        const name = nickname || realName;

        // For fallback IDs, strip everything in parentheses to help group variations of the same name
        const cleanName = name.replace(/\s/g, '').replace(/\(.*\)/, '');
        const idFromRow = (row[idKey] || "").toString().trim();
        const rawId = idFromRow || cleanName;
        
        const roleRaw = (row[roleKey] || "").toString();
        const dist = parseFloat(String(row[distKey]).replace(/[^0-9.]/g, '') || "0");
        const count = parseInt(String(row[countKey]).replace(/[^0-9]/g, '') || "1");

        if (!name || !rawId) continue;

        // Role Parsing - Prioritize the '소속' column as requested
        let role: UserRole = 'resident';
        const roleStr = (roleRaw || "").toString().toLowerCase();
        
        if (roleStr.includes('학생')) role = 'student';
        else if (roleStr.includes('교') || roleStr.includes('직원') || roleStr.includes('선생')) role = 'teacher';
        else if (roleStr.includes('학부모') || roleStr.includes('가족') || roleStr.includes('부모')) role = 'parent';
        else {
          // Fallback to name/nickname contents if affiliation is empty
          const fullText = (name + " " + roleStr).toLowerCase();
          if (fullText.includes('학생')) role = 'student';
          else if (fullText.includes('교') || fullText.includes('선생')) role = 'teacher';
          else if (fullText.includes('부모')) role = 'parent';
        }

        // Student ID Extraction from Nickname
        // Rule: 5 digits, but NOT starting with RUNNER (e.g., RUNNER30801 is NOT a student ID)
        // Also detect if the nickname itself is a default RUNNER ID (e.g., RUNNER-102)
        const isRunnerDefaultId = /RUNNER[-]?\d+/i.test(nickname);
        let studentId = null;
        if (nickname && !isRunnerDefaultId) {
          // Remove RUNNER IDs first (though we just checked, extra safety)
          const cleanedNickname = nickname.replace(/RUNNER\d+/gi, '');
          const digit5Match = cleanedNickname.match(/([1-3][0-9]{4})/);
          if (digit5Match) {
            studentId = digit5Match[1];
          }
        }
        
        // Class Parsing logic from name/nickname if studentId wasn't found
        let grade = 0;
        let classNum = 0;
        if (studentId) {
          grade = parseInt(studentId[0]);
          classNum = parseInt(studentId.substring(1, 3));
        } else if (!isRunnerDefaultId) { // Skip extraction if it's a RUNNER default ID
          const textMatch = name.match(/([1-3])\s*[학년-]\s*([0-9]{1,2})\s*반?/);
          if (textMatch) {
            grade = parseInt(textMatch[1]);
            classNum = parseInt(textMatch[2]);
          }
        }

        const isValidClass = (g: number, c: number) => {
          if (g === 1) return c >= 1 && c <= 14;
          if (g === 2) return c >= 1 && c <= 13;
          if (g === 3) return c >= 1 && c <= 14;
          return false;
        };

        let currentClassId = null;
        // Parents are NOT included in class rankings, even if they have grade/class info
        if (role !== 'parent' && isValidClass(grade, classNum)) {
          currentClassId = `${grade}-${classNum}`;
          // If a valid class is found, prioritize being a student/teacher
          if (role === 'resident') {
            role = 'student';
          }
        }

        // AGGREGATE USER DATA
        if (!userUpdates[rawId]) {
          userUpdates[rawId] = {
            displayName: name,
            role,
            totalDistance: 0,
            runCount: 0,
            classId: currentClassId,
            studentId: studentId
          };
        } else {
          // Prioritize nickname if it appears in any row for this user
          if (nickname && nickname.length > 0) {
            userUpdates[rawId].displayName = nickname;
          } else if (!userUpdates[rawId].displayName && realName) {
            userUpdates[rawId].displayName = realName;
          }

          // Prioritize roles: teacher > student > parent > resident
          const rolePriority: Record<string, number> = { 'teacher': 3, 'student': 2, 'parent': 1, 'resident': 0 };
          const currentRolePriority = rolePriority[role] ?? 0;
          const existingRolePriority = rolePriority[userUpdates[rawId].role] ?? 0;
          
          if (currentRolePriority > existingRolePriority) {
            userUpdates[rawId].role = role;
          }
          
          // Preserve classId (only if not parent) or studentId if found in any row
          if (userUpdates[rawId].role !== 'parent' && !userUpdates[rawId].classId && currentClassId) {
            userUpdates[rawId].classId = currentClassId;
          }
          
          if (role === 'parent' || userUpdates[rawId].role === 'parent') {
             userUpdates[rawId].classId = null; // Forced removal for parents
          }

          if (!userUpdates[rawId].studentId && studentId) {
            userUpdates[rawId].studentId = studentId;
          }
        }
        userUpdates[rawId].totalDistance = Number((userUpdates[rawId].totalDistance + dist).toFixed(2));
        userUpdates[rawId].runCount += count;

        // Cumulative Global Stats
        globalTotalDistance += dist;
        globalParticipants.add(rawId);
      }

      // WRITE AGGREGATED USERS & UPDATE CLASS TOTALS
      for (const [userId, update] of Object.entries(userUpdates)) {
        let finalDisplayName = update.displayName;
        
        // Final Masking for parents/external residents
        if (update.role === 'parent' || (update.role === 'resident' && !update.classId)) {
          // Identify potential Korean name - prioritizing the start or clearly segmented sequence
          // We target 2-4 syllable blocks.
          const korNameMatch = finalDisplayName.match(/([가-힣]{2,4})/);
          if (korNameMatch) {
            const korName = korNameMatch[1];
            // Don't mask common labels like "학부모", "가족" if they are the ONLY Korean part
            if (korName !== '학부모' && korName !== '가족') {
              const masked = korName.substring(0, korName.length - 1) + 'O';
              finalDisplayName = finalDisplayName.replace(korName, masked);
            } else {
              // If it ONLY has "학부모", look for another block if available? 
              // Actually, most will be "Name(학부모)". The regex is greedy enough for the first match.
            }
          }
        }

        // Update User Doc
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
          displayName: finalDisplayName,
          role: update.role,
          totalDistance: update.totalDistance,
          runCount: update.runCount,
          classId: update.classId || null,
          studentId: update.studentId || null,
          updatedAt: Timestamp.now()
        }, { merge: true });

        // Update Class Aggregate (Students/Teachers only)
        if (update.classId && (update.role === 'student' || update.role === 'teacher')) {
          const cId = update.classId;
          const [g, c] = cId.split('-').map(Number);
          
          if (!classDataMap[cId]) {
            classDataMap[cId] = { totalDistance: 0, participants: new Set(), grade: g, classNumber: c };
          }
          classDataMap[cId].totalDistance = Number((classDataMap[cId].totalDistance + update.totalDistance).toFixed(2));
          classDataMap[cId].participants.add(userId);
        }
      }

      // Write Aggregated Classes
      for (const [classId, stats] of Object.entries(classDataMap)) {
        const classRef = doc(db, 'classes', classId);
        await setDoc(classRef, {
          id: classId,
          grade: stats.grade,
          classNumber: stats.classNumber,
          totalDistance: stats.totalDistance,
          participantCount: stats.participants.size,
          updatedAt: Timestamp.now()
        });
      }

      // Global Stats
      const statsRef = doc(db, 'globalStats', 'current');
      await setDoc(statsRef, {
        totalDistance: globalTotalDistance,
        totalParticipants: globalParticipants.size,
        lastUpdated: Timestamp.now()
      });
      
      return { success: true, count: Object.keys(userUpdates).length };
    } catch (err) {
      console.error("Bulk update failed", err);
      throw err;
    }
  };

  return {
    user,
    profile,
    globalStats,
    recentRuns,
    topRunners,
    topClasses,
    loading,
    getClassMembers,
    bulkUpdateFromCSV
  };
}
