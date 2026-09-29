export type ShotType = 'middle' | 'layup';

export interface ShotCriterion {
  id: number;
  text: string;
  shortName: string;
  focusArea: string;
  commonMistake: string;
}

export const MIDDLE_SHOT_CRITERIA: ShotCriterion[] = [
  {
    id: 1,
    text: '슛 직전 무릎을 부드럽게 굽혀 반동을 이용하여 슛 할 수 있다.',
    shortName: '무릎 반동 활용',
    focusArea: '하체 딥(Dip) 및 탄력 전달',
    commonMistake: '무릎을 굽히지 않고 상체 팔 힘으로만 던지는 경우'
  },
  {
    id: 2,
    text: '슛 릴리스 위치가 캐치한 공의 위치보다 높은 곳에서 이루어 질 수 있게 할 수 있다.',
    shortName: '높은 릴리스 타점',
    focusArea: '타점(Set Point) 및 시선 확보',
    commonMistake: '가슴이나 턱 앞에서 밀어 던져 타점이 낮은 경우'
  },
  {
    id: 3,
    text: '슛 이후 림을 향해 팔을 끝까지 뻗는 팔로우 스로우 동작을 수행할 수 있다.',
    shortName: '팔로우 스로우',
    focusArea: '슛 라인 고정 및 백스핀 유지',
    commonMistake: '슛 직후 팔을 급하게 바로 내리거나 림 밖으로 비틀어지는 경우'
  },
  {
    id: 4,
    text: '슛 릴리스 시 손목 스냅을 활용할 수 있다.',
    shortName: '손목 스냅',
    focusArea: '손목 꺾임(Goose Neck)과 백스핀',
    commonMistake: '손목 스냅 없이 손바닥으로 밀어 공의 회전이 부족한 경우'
  }
];

export const LAYUP_SHOT_CRITERIA: ShotCriterion[] = [
  {
    id: 1,
    text: '드리블-캐치 후 레이업 시 스텝을 정확하게 구사할 수 있다.',
    shortName: '정확한 1-2 스텝',
    focusArea: '오른손 레이업 시 오른발-왼발 도약 스텝',
    commonMistake: '스텝이 엉키거나 트래블링(3보 이상)을 범하는 경우'
  },
  {
    id: 2,
    text: '백보드의 사각형 겨냥점을 정확히 맞출 수 있다.',
    shortName: '백보드 겨냥점 명중',
    focusArea: '백보드 사각형 상단 코너 터치',
    commonMistake: '림만 보고 던지거나 겨냥점을 빗나가 림을 강하게 튀어나오는 경우'
  },
  {
    id: 3,
    text: '점프할 때 한 쪽 다리를 들어올려 수직 추진력을 얻을 수 있다.',
    shortName: '수직 도약 무릎 리프트',
    focusArea: '점프 시 안쪽 무릎을 높게 차올려 수직 상승',
    commonMistake: '앞으로만 쏠려 전방 충돌하거나 충분한 높이로 도약하지 못하는 경우'
  },
  {
    id: 4,
    text: '드리블-스텝-점프까지의 과정이 끊김없이 연결된 동작으로 수행할 수 있다.',
    shortName: '유기적 연결 동작',
    focusArea: '속도 유지와 부드러운 릴리스 흐름',
    commonMistake: '캐치 순간 멈칫하며 속도가 줄어 점프 타이밍이 끊기는 경우'
  }
];

export interface Student {
  id: string;
  classId: string;
  number: number;
  name: string;
}

export interface Classroom {
  id: string;
  name: string;
}

export type CriterionAssessment = 'good' | 'bad' | 'none';

export interface FeedbackItem {
  id: string;
  classId: string;
  performerId: string;
  performerName: string;
  observerId: string;
  observerName: string;
  observerNumber?: number;
  isTeacher?: boolean;
  shotType: ShotType;
  stars: number; // 1, 2, or 3
  criteriaResults: Record<number, CriterionAssessment>;
  comment: string;
  timestamp: number;
  favoriteRewarded?: boolean; // performer rewarded a star back
  favoriteRewardedAt?: number;
  session?: number; // 차시 (1차시, 2차시, 3차시..., 기본값 1)
  updatedAt?: number; // 수정 일시 (수정된 경우)
}

export interface AiEvaluation {
  performerId: string;
  shotType: ShotType;
  overallGrade: '우수' | '보통' | '노력요함';
  summary: string;
  strengths: string[];
  weaknesses: string[];
  actionTips: string[];
  criteriaAnalysis: {
    criterionId: number;
    criterionTitle: string;
    status: '잘함' | '보완필요' | '판단보류';
    detail: string;
  }[];
  generatedAt: number;
}

export interface TeacherQuestion {
  classId: string;
  question: string;
  session?: number;
  updatedAt: number;
}

export interface StudentAnswer {
  id: string;
  classId: string;
  studentId: string;
  studentName: string;
  studentNumber: number;
  answer: string;
  session?: number; // 차시 정보 (1~17)
  updatedAt: number;
}

export interface GameScoreItem {
  id: string;
  studentId?: string;
  studentName: string;
  studentNumber?: number;
  classId?: string;
  className?: string;
  score: number;
  totalShots: number;
  madeShots: number;
  perfectCount: number;
  maxCombo: number;
  shotTypesBreakdown?: {
    middleMade: number;
    middleTotal: number;
    layupMade: number;
    layupTotal: number;
  };
  timestamp: number;
}

export interface AppStateData {
  classes: Classroom[];
  students: Student[];
  feedbacks: FeedbackItem[];
  aiEvaluations: Record<string, AiEvaluation>; // key: `${performerId}_${shotType}`
  teacherQuestions?: Record<string, TeacherQuestion>; // key: classId
  sessionQuestions?: Record<number, string>; // key: session number (1~17)
  classSessionQuestions?: Record<string, Record<number, string>>; // key: classId -> session number (1~17) -> question text
  studentAnswers?: Record<string, StudentAnswer>; // key: `${classId}_${studentId}` or `${classId}_${studentId}_s${session}`
  activeSessions?: Record<string, number>; // key: classId -> active session number (1, 2, 3...)
  gameScores?: GameScoreItem[]; // 별빛 버저비터 게임 랭킹 데이터
}

export type AppMode = 'home' | 'performer' | 'observer' | 'all' | 'teacher';
