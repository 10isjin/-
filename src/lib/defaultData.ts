import { Classroom, Student, AppStateData } from '../types';

export function getDefaultClasses(): Classroom[] {
  return Array.from({ length: 11 }, (_, i) => ({
    id: `3-${i + 1}`,
    name: `3학년 ${i + 1}반`
  }));
}

export function getDefaultStudents(): Student[] {
  return [
    // 3학년 1반
    { id: 'c1-1', classId: '3-1', number: 1, name: '강민준' },
    { id: 'c1-2', classId: '3-1', number: 2, name: '김도윤' },
    { id: 'c1-3', classId: '3-1', number: 3, name: '박서준' },
    { id: 'c1-4', classId: '3-1', number: 4, name: '이지호' },
    { id: 'c1-5', classId: '3-1', number: 5, name: '최하은' },
    { id: 'c1-6', classId: '3-1', number: 6, name: '정예원' },
    { id: 'c1-7', classId: '3-1', number: 7, name: '윤시우' },
    { id: 'c1-8', classId: '3-1', number: 8, name: '한지민' },

    // 3학년 2반
    { id: 'c2-1', classId: '3-2', number: 1, name: '송민우' },
    { id: 'c2-2', classId: '3-2', number: 2, name: '오태양' },
    { id: 'c2-3', classId: '3-2', number: 3, name: '임수빈' },
    { id: 'c2-4', classId: '3-2', number: 4, name: '조유나' },
    { id: 'c2-5', classId: '3-2', number: 5, name: '배준혁' },

    // 3학년 3반
    { id: 'c3-1', classId: '3-3', number: 1, name: '권유진' },
    { id: 'c3-2', classId: '3-3', number: 2, name: '신재원' },
    { id: 'c3-3', classId: '3-3', number: 3, name: '안서현' }
  ];
}

export function getDefaultAppState(): AppStateData {
  return {
    classes: getDefaultClasses(),
    students: getDefaultStudents(),
    feedbacks: [],
    aiEvaluations: {},
    teacherQuestions: {},
    studentAnswers: {},
    activeSessions: {}
  };
}
