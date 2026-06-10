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
  getDocs,
  deleteDoc
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
      orderBy('totalDistance', 'desc'),
      orderBy('__name__', 'asc')
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
    const q = query(collection(db, 'classes'), orderBy('totalDistance', 'desc'), orderBy('__name__', 'asc'), limit(50));
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
    // We use Asia/Seoul timezone to ensure "Today" aligns with the users in Korea
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
    const lastVisit = localStorage.getItem('last_visit_date');

    if (lastVisit === today) return;

    try {
      const visitorRef = doc(db, 'stats', 'visitors');
      
      // Use nested object structure for setDoc + merge to ensure it's stored as a Map, not a flat field with dots
      await setDoc(visitorRef, {
        totalVisits: increment(1),
        dailyVisits: {
          [today]: increment(1)
        }
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
        .sort((a, b) => (b.totalDistance - a.totalDistance) || a.id.localeCompare(b.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${classId}`);
      return [];
    }
  };

  const bulkUpdateFromCSV = async (data: any[]) => {
    if (!user || user.email !== "yelloboll@goedu.kr") throw new Error("Unauthorized");
    
    try {
      // 0. PRE-UPDATE: Calculate current ranks from existing Firestore data to preserve as "previousRank"
      const existingUsersSnap = await getDocs(collection(db, 'users'));
      const existingClassesSnap = await getDocs(collection(db, 'classes'));

      const existingUsers = existingUsersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const existingClasses = existingClassesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      const sortedExistingUsers = [...existingUsers].sort((a, b) => (b.totalDistance || 0) - (a.totalDistance || 0) || a.id.localeCompare(b.id));
      const sortedExistingClasses = [...existingClasses].sort((a, b) => (b.totalDistance || 0) - (a.totalDistance || 0) || a.id.localeCompare(b.id));

      const userRankMap: Record<string, number> = {};
      sortedExistingUsers.forEach((u, i) => { userRankMap[u.id] = i + 1; });

      const classRankMap: Record<string, number> = {};
      sortedExistingClasses.forEach((c, i) => { classRankMap[c.id] = i + 1; });

      const userUpdates: Record<string, { 
        displayName: string, 
        role: UserRole, 
        totalDistance: number, 
        runCount: number,
        classId: string | null,
        studentId: string | null
      }> = {};

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

        // Student ID & Class Extraction logic improved for multiple patterns
        const isNicknameRunner = /RUNNER[-]?\d+/i.test(nickname);
        const isRealNameRunner = /RUNNER[-]?\d+/i.test(realName);

        let studentId = null;
        let grade = 0;
        let classNum = 0;

        // Try extracting from non-RUNNER strings
        const extractionTargets = [];
        if (!isNicknameRunner && nickname) extractionTargets.push(nickname);
        if (!isRealNameRunner && realName) extractionTargets.push(realName);

        for (const target of extractionTargets) {
          if (grade) break;

          // Pattern 1: Standalone 5-digit number (e.g., 10320 -> 1-03)
          // We use word boundaries \b and check for exactly 5 digits to avoid matching parts of longer strings
          const digit5Match = target.match(/\b([1-3])([0-9]{2})[0-9]{2}\b/);
          if (digit5Match) {
            grade = parseInt(digit5Match[1]);
            classNum = parseInt(digit5Match[2]);
            studentId = digit5Match[0];
            continue;
          }

          // Pattern 2: G-C format (e.g., 1-6담임, 교사3-4, 1학년 3반)
          const textMatch = target.match(/([1-3])\s*[학년\/\-]\s*([0-9]{1,2})\s*반?/);
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

      // Special handling for Lee Joo-young (1-10 담임): Always add +17.78 km to her csv-provided distance
      for (const [userId, update] of Object.entries(userUpdates)) {
        const isLeeJooYoung = update.displayName.includes('이주영') && 
          (update.displayName.includes('1-10') || update.classId === '1-10' || userId === '이주영');
        
        if (isLeeJooYoung) {
          update.totalDistance = Number((update.totalDistance + 17.78).toFixed(2));
        }
      }

      const existingUserMap = new Map<string, any>();
      existingUsers.forEach(u => existingUserMap.set(u.id, u));

      // 1. UPDATE ALL INDIVIDUAL USERS
      // We first normalize and update all users from the CSV.
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

        // Normalize classId format to string "G-C" (e.g., "1-1")
        const normalizedRole = update.role;
        const normalizedClassId = (update.role === 'student' || update.role === 'teacher') ? update.classId : null;

        const previousUser = existingUserMap.get(userId);
        const prevTotal = previousUser?.totalDistance || 0;
        const previousHistory = previousUser?.history || {};
        
        // Calculate the delta distance
        const delta = Math.max(0, update.totalDistance - prevTotal);
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
        
        const finalHistory = { ...previousHistory };
        if (delta > 0) {
          finalHistory[todayStr] = Number(((finalHistory[todayStr] || 0) + delta).toFixed(2));
        }

        await setDoc(doc(db, 'users', userId), {
          displayName: finalDisplayName,
          role: normalizedRole,
          totalDistance: update.totalDistance,
          runCount: update.runCount,
          classId: normalizedClassId,
          studentId: update.studentId || null,
          previousRank: userRankMap[userId] || null,
          history: finalHistory,
          updatedAt: Timestamp.now()
        }, { merge: true });
      }

      // 2. FULL RECALCULATION: Fetch all users from DB and rebuild Classes & Global Stats
      // This ensures that even users NOT in the current CSV but still in Firestore are accounted for
      // or their outdated class assignments are handled.
      const allUsersSnap = await getDocs(collection(db, 'users'));
      const newClassAggregates: Record<string, { dist: number, participants: Set<string>, g: number, c: number }> = {};
      let totalDistanceSum = 0;
      let totalParticipantsCount = 0;

      allUsersSnap.forEach(uDoc => {
        const u = uDoc.data();
        const d = u.totalDistance || 0;
        totalDistanceSum += d;
        
        // Count as "overall participant" if they have run at least some distance
        if (d > 0) totalParticipantsCount++;

        // Class Aggregation: Only students and teachers count towards class stats
        if (u.classId && (u.role === 'student' || u.role === 'teacher')) {
          const classId = String(u.classId).trim();
          if (!newClassAggregates[classId]) {
            const parts = classId.split('-');
            const g = parseInt(parts[0]) || 0;
            const c = parseInt(parts[1]) || 0;
            newClassAggregates[classId] = { dist: 0, participants: new Set(), g, c };
          }
          newClassAggregates[classId].dist += d;
          if (d > 0) {
            newClassAggregates[classId].participants.add(uDoc.id);
          }
        }
      });

      // 3. WRITE OR DELETE UPDATED CLASS STATS
      // We check all existing classes. If they no longer have distance/students, DELETE THEM.
      for (const clsDoc of existingClassesSnap.docs) {
        const classId = clsDoc.id;
        const stats = newClassAggregates[classId];
        
        if (stats && (stats.dist > 0 || stats.participants.size > 0)) {
          await setDoc(doc(db, 'classes', classId), {
            totalDistance: Number(stats.dist.toFixed(2)),
            participantCount: stats.participants.size,
            previousRank: classRankMap[classId] || null,
            updatedAt: Timestamp.now()
          }, { merge: true });
        } else {
          // AUTO-EXCLUDE: Delete classes with no distance or participants
          await deleteDoc(doc(db, 'classes', classId));
        }
        
        delete newClassAggregates[classId];
      }

      // 4. WRITE ANY NEW CLASSES
      for (const [classId, stats] of Object.entries(newClassAggregates)) {
        if (stats.dist > 0 || stats.participants.size > 0) {
          await setDoc(doc(db, 'classes', classId), {
            id: classId,
            grade: stats.g,
            classNumber: stats.c,
            totalDistance: Number(stats.dist.toFixed(2)),
            participantCount: stats.participants.size,
            previousRank: null,
            updatedAt: Timestamp.now()
          }, { merge: true });
        }
      }

      // 5. WRITE FINAL GLOBAL STATS
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
