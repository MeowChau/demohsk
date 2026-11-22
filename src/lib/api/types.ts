import type { QuestionImageRegion } from "./question-adapter";

export interface HskUser {
  id: number | string;
  email: string | null;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  photo?: { id: string; path: string } | null;
  role?: { id: number; name?: string };
  emailVerifiedAt?: string | null;
  currentHskLevel?: number | null;
  targetHskLevel?: number | null;
  dailyStudyTime?: number | null;
  level: number;
  currentExp: number;
  studentCode?: number | null;
  createdAt?: string;
}
export interface PageData<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export interface HskTopic {
  id: string;
  topicKey: string;
  titleCn: string;
  titleVi: string;
  pinyin: string;
  hskLevel: number;
  totalSets: number;
  totalQuestions: number;
  vocabularyCount: number;
  icon?: string;
  listeningCount: number;
  speakingCount: number;
  readingCount: number;
  writingCount: number;
}
// Minimal dashboard projection; question payloads stay on the lesson routes.
export type DashboardTopic = Pick<HskTopic, "topicKey" | "titleVi" | "titleCn" | "hskLevel" | "totalSets">;

export interface HskWord {
  id: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
  hskLevel: number;
  topic?: string | null;
}
export interface HskQuestion {
  id: number;
  type: string;
  skill: string;
  hskLevel: number;
  payload: {
    templateId?: string;
    text?: string;
    sentence?: string;
    questionText?: string;
    character?: string;
    hanzi?: string;
    meaning?: string;
    source?: { sourceWord?: string };
    imageUrl?: string;
    imageRegion?: QuestionImageRegion;
    contextImageUrl?: string;
    continuationImageUrl?: string;
    audioUrl?: string;
    options?: unknown[];
    optionImages?: unknown[];
    pinyin?: string;
    manualGrading?: boolean;
    reviewRequired?: boolean;
    correctOptionId?: string;
    translation?: string;
    audioTimestamp?: number;
    audioScope?: string;
  };
  correctAnswer?: {
    optionId?: unknown;
    correctOptionId?: unknown;
    id?: unknown;
    answer?: unknown;
    answers?: unknown;
    rubric?: unknown;
  } | null;
}
export interface HskPractice {
  id: number;
  title: string;
  hskLevel: number;
  skill: string;
  topic: string;
  audioUrl?: string;
  totalQuestions?: number;
  practiceSetQuestions?: {
    questionId: number;
    order: number;
    question: HskQuestion | null;
  }[];
}
export interface HskExam {
  id: number;
  title: string;
  hskLevel: number;
  totalQuestions?: number;
  description?: string;
  access?: ExamAccess;
  sections?: {
    id: number;
    title: string;
    order: number;
    audioUrl?: string;
    questionCount?: number;
    skill?: string;
    sectionQuestions: {
      questionId: number;
      order: number;
      question: HskQuestion | null;
    }[];
  }[];
}
export interface ExamAccess {
  isFree: boolean;
  isPurchased: boolean;
  canAttempt: boolean;
  price: number;
  currency: "VND";
}
export interface ExamPayment {
  id: string;
  examId: number | null;
  examTitle: string;
  amount: number;
  currency: "VND";
  status: "creating" | "pending" | "paid" | "cancelled" | "expired";
  checkoutUrl: string | null;
  expiresAt: string;
  paidAt: string | null;
  accessGranted: boolean;
}
export interface HskAnalytics {
  timeZone: string;
  studyDate: string;
  checkedInToday: boolean;
  timeTodaySeconds: number;
  time7DaysSeconds: number;
  timeTotalSeconds: number;
  chart7DaysSeconds: number[];
  chart7Dates: string[];
  longestStreak: number;
  totalDaysStudied: number;
  weekDaysStudied: number;
  weekAverageSeconds: number;
  weekLongestStreak: number;
  activityTimes: { review: number; practice: number; exam: number; pk: number };
  vocabularyStats: {
    learnedCount: number;
    masteredCount: number;
    learningCount: number;
    reviewCount: number;
  };
}

export interface LeaderboardRow {
  id: number;
  fullName: string;
  studentCode: number | null;
  level: number;
  currentExp: number;
  currentHskLevel: number | null;
  targetHskLevel: number | null;
  photo: { id?: string; path: string } | null;
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  totalHours: number;
  totalExp?: number;
  rank?: number;
}
export interface LeaderboardData {
  leaderboard: LeaderboardRow[];
  myRank?: number | null;
  myTotalExp?: number | null;
  summary: { totalStudents: number; totalStudyHours: number; activeStreaksCount: number; allTimeRecord: number };
}
export interface OfflineScore { id: number; score: number; playedAt: string }
export interface PkHistory {
  id: string; matchIndex: number; hskLevel: number; opponentName: string;
  score: number; correctCount: number; totalQuestions: number; isWin: boolean;
  isDraw: boolean; xpEarned: number; reason: string; completedAt: string | null;
}
export interface WritingAssessment { score: number; grammarErrors: { error: string; correction: string }[]; feedback: string }
export interface PronunciationAssessment {
  progressSaved?: boolean; progressMessage?: string;
  score: number; accuracyScore: number; fluencyScore: number; completenessScore: number;
  recognizedText: string; feedback: string; words: { word: string; accuracyScore: number | null; errorType: string; phonemes?: { phoneme: string; accuracyScore: number }[] }[];
}
