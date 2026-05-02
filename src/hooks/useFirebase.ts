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
import { Run, UserProfile, GlobalStats, UserRole, ClassProfile, VisitorStats } from '../types';

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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
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
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
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
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null);
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
          handleFirestoreError(e, OperationType.GET, `users/${user.uid}`);
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

  // Visitor Stats Listener (Admin Only)
  useEffect(() => {
    if (!user || user.email !== "yelloboll@goedu.kr") return;

    const visitorDoc = doc(db, 'stats', 'visitors');
    const unsub = onSnapshot(visitorDoc, (snap) => {
      if (snap.exists()) {
        setVisitorStats(snap.data() as VisitorStats);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'stats/visitors'));
    return unsub;
  }, [user]);

  const trackVisit = async () => {
    const today = new Date().toISOString().split('T')[0];
    const lastVisit = localStorage.getItem('last_visit_date');

    if (lastVisit === today) return;

    try {
      const visitorRef = doc(db, 'stats', 'visitors');
      const dayField = `dailyVisits.${today}`;
      
      await setDoc(visitorRef, {
        totalVisits: increment(1),
        [dayField]: increment(1)
      }, { merge: true });

      localStorage.setItem('last_visit_date', today);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'stats/visitors');
    }
  };

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
        const distKey = keys.find(k => 
          k.includes('누적') || k.includes('거리') || k.includes('합계') || 
          k.toLowerCase().includes('dist') || k.toLowerCase().includes('total')
        ) || '';
        const countKey = keys.find(k => k.includes('횟수') || k.toLowerCase().includes('count')) || '';

        const nickname = (row[nicknameKey] || "").toString().trim();
        const realName = (row[nameKey] || "").toString().trim();
        
        // Use nickname as the primary display name
        const name = nickname || realName;

        // For fallback IDs, strip everything in parentheses
        const cleanName = name.replace(/\s/g, '').replace(/\(.*\)/, '');
        const idFromRow = (row[idKey] || "").toString().trim();
        const rawId = idFromRow || cleanName;
        
        const roleRaw = (row[roleKey] || "").toString();
        const dist = parseFloat(String(row[distKey]).replace(/[^0-9.]/g, '') || "0");
        const count = parseInt(String(row[countKey]).replace(/[^0-9]/g, '') || "1");

        if (!name || !rawId) continue;

        // Role Parsing
        let role: UserRole = 'resident';
        const roleStr = (roleRaw || "").toString().toLowerCase();
        
        if (roleStr.includes('학생')) role = 'student';
        else if (roleStr.includes('교') || roleStr.includes('직원') || roleStr.includes('선생')) role = 'teacher';
        else if (roleStr.includes('학부모') || roleStr.includes('가족') || roleStr.includes('부모')) role = 'parent';
        else {
          const fullText = (name + " " + roleStr).toLowerCase();
          if (fullText.includes('학생')) role = 'student';
          else if (fullText.includes('교') || fullText.includes('선생')) role = 'teacher';
          else if (fullText.includes('부모')) role = 'parent';
        }

        // Student ID & Class Extraction
        const isRunnerDefaultId = /RUNNER[-]?\d+/i.test(nickname);
        let studentId = null;
        let grade = 0;
        let classNum = 0;

        if (nickname && !isRunnerDefaultId) {
          const cleanedNickname = nickname.replace(/RUNNER\d+/gi, '');
          const digit5Match = cleanedNickname.match(/([1-3][0-9]{4})/);
          if (digit5Match) {
            studentId = digit5Match[1];
            grade = parseInt(studentId[0]);
            classNum = parseInt(studentId.substring(1, 3));
          }
        }
        
        if (!grade && !isRunnerDefaultId) {
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
        if (role !== 'parent' && isValidClass(grade, classNum)) {
          currentClassId = `${grade}-${classNum}`;
          if (role === 'resident') role = 'student';
        }

        // AGGREGATE USER DATA (Cumulative logic within this single CSV if multiple rows for same user)
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
          if (nickname) userUpdates[rawId].displayName = nickname;
          
          const rolePriority: Record<string, number> = { 'teacher': 3, 'student': 2, 'parent': 1, 'resident': 0 };
          if ((rolePriority[role] ?? 0) > (rolePriority[userUpdates[rawId].role] ?? 0)) {
            userUpdates[rawId].role = role;
          }
          
          if (userUpdates[rawId].role !== 'parent' && !userUpdates[rawId].classId) {
            userUpdates[rawId].classId = currentClassId;
          }
          if (!userUpdates[rawId].studentId) userUpdates[rawId].studentId = studentId;
        }
        userUpdates[rawId].totalDistance = Number((userUpdates[rawId].totalDistance + dist).toFixed(2));
        userUpdates[rawId].runCount += count;
      }

      // 1. UPDATE ALL INDIVIDUAL USERS
      for (const [userId, update] of Object.entries(userUpdates)) {
        let finalDisplayName = update.displayName;
        if (update.role === 'parent' || (update.role === 'resident' && !update.classId)) {
          const korNameMatch = finalDisplayName.match(/([가-힣]{2,4})/);
          if (korNameMatch) {
            const korName = korNameMatch[1];
            if (korName !== '학부모' && korName !== '가족') {
              finalDisplayName = finalDisplayName.replace(korName, korName.substring(0, korName.length - 1) + 'O');
            }
          }
        }

        await setDoc(doc(db, 'users', userId), {
          displayName: finalDisplayName,
          role: update.role,
          totalDistance: update.totalDistance,
          runCount: update.runCount,
          classId: update.classId || null,
          studentId: update.studentId || null,
          updatedAt: Timestamp.now()
        }, { merge: true });
      }

      // 2. FULL RECALCULATION: Fetch all users from DB and rebuild Classes & Global Stats
      // This is the "Source of Truth" sync.
      const allUsersSnap = await getDocs(collection(db, 'users'));
      const newClassAggregates: Record<string, { dist: number, participants: Set<string>, g: number, c: number }> = {};
      let totalDistanceSum = 0;
      let totalParticipantsCount = 0;

      allUsersSnap.forEach(uDoc => {
        const u = uDoc.data();
        const d = u.totalDistance || 0;
        totalDistanceSum += d;
        totalParticipantsCount++;

        if (u.classId && (u.role === 'student' || u.role === 'teacher')) {
          if (!newClassAggregates[u.classId]) {
            const [g, c] = u.classId.split('-').map(Number);
            newClassAggregates[u.classId] = { dist: 0, participants: new Set(), g, c };
          }
          newClassAggregates[u.classId].dist += d;
          newClassAggregates[u.classId].participants.add(uDoc.id);
        }
      });

      // 3. WRITE UPDATED CLASS STATS
      for (const [classId, stats] of Object.entries(newClassAggregates)) {
        await setDoc(doc(db, 'classes', classId), {
          id: classId,
          grade: stats.g,
          classNumber: stats.c,
          totalDistance: Number(stats.dist.toFixed(2)),
          participantCount: stats.participants.size,
          updatedAt: Timestamp.now()
        });
      }

      // 4. WRITE FINAL GLOBAL STATS
      await setDoc(doc(db, 'globalStats', 'current'), {
        totalDistance: Number(totalDistanceSum.toFixed(2)),
        totalParticipants: totalParticipantsCount,
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
    visitorStats,
    loading,
    getClassMembers,
    bulkUpdateFromCSV,
    trackVisit
  };
}
