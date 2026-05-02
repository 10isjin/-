import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'teacher' | 'parent' | 'resident';

export interface Run {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  distance: number; // km
  timestamp: Timestamp;
}

export interface UserProfile {
  id: string;
  displayName: string;
  role: UserRole;
  totalDistance: number;
  runCount: number;
  classId?: string | null;
  studentId?: string | null;
}

export interface ClassProfile {
  id: string; // e.g., "3-7"
  grade: number;
  classNumber: number;
  totalDistance: number;
  participantCount: number;
}

export interface GlobalStats {
  totalDistance: number;
  totalParticipants: number;
  lastUpdated: Timestamp;
}

export const CHALLENGE_GOAL = 40075; // Earth's circumference in km
export const START_DATE = new Date('2026-04-22');
export const END_DATE = new Date('2026-06-22');
