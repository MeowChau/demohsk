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
  topic: string;
  titleCn: string;
  titleVi: string;
  pinyin: string;
  hskLevel: number;
  totalSets: number;
  totalQuestions: number;
  vocabularyCount: number;
}
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
    text?: string;
    imageUrl?: string;
    contextImageUrl?: string;
    continuationImageUrl?: string;
    audioUrl?: string;
    options?: string[];
    optionImages?: string[];
    pinyin?: string;
    manualGrading?: boolean;
  };
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
  sections?: {
    id: number;
    title: string;
    order: number;
    audioUrl?: string;
    sectionQuestions: {
      questionId: number;
      order: number;
      question: HskQuestion | null;
    }[];
  }[];
}
export interface HskAnalytics {
  timeTodaySeconds: number;
  time7DaysSeconds: number;
  timeTotalSeconds: number;
  chart7DaysSeconds: number[];
  chart7Dates: string[];
  longestStreak: number;
  totalDaysStudied: number;
  vocabularyStats: {
    learnedCount: number;
    masteredCount: number;
    learningCount: number;
    reviewCount: number;
  };
}
