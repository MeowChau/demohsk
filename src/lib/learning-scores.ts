import type { Skill } from "@/types/assessment";
import type { PracticeScore } from "@/lib/practice-scoring";
export interface SkillAverage {
  score: number | null; sampleCount: number; questionCount: number; updatedAt: string | null;
  taskKind?: "word" | "sentence" | "passage";
}
export interface LearningScoreSummary {
  currentHskLevel: number | null;
  estimatedHskLevel: number | null;
  evidence: { level: number; score: number; maxScore: number; at: string } | null;
  hskLevel: number;
  skills: Record<Skill, SkillAverage>;
  writingProgress: { completed: number; total: number; correctStrokes: number; totalStrokes: number; mistakes: number };
}
export interface SubmittedLearningScore extends PracticeScore {
  historyId?: string; submittedAt?: string; accuracyPercent?: number | null;
  currentHskLevel: number | null; previousCurrentHskLevel: number | null;
  hskLevel: number; estimatedHskLevel: number | null; previousHskLevel: number | null; sourceVersion: string;
  sections: { skill: Skill; score: number | null; earned: number; possible: number; correctCount: number; gradedCount: number; totalQuestions: number; complete: boolean }[];
  totalScore: number | null; maxScore: number; passScore: number | null; eligible: boolean; passed: boolean; reasons: string[];
}
export interface LearningScoreSubmission {
  attemptId: string; kind: "exam" | "set"; sourceId: number; answers: Record<string,string>;
  startedAt?: string; durationSeconds?: number;
  writingProgress?: Record<string,{ completedPositions: number[]; correctStrokes: number; totalStrokes: number; mistakes: number }>;
}
export type LearningAttemptContext = Pick<LearningScoreSubmission, "attemptId" | "kind" | "sourceId">;
