import type { LearningScoreSubmission as Submission } from "./api/generated/learning-contract";
export type { SkillAverage, LearningScoreSummary, SavedScore as SubmittedLearningScore } from "./api/generated/learning-contract";
export interface LearningScoreSubmission extends Omit<Submission, "writingProgress"> {
  writingProgress?: Record<string, { completedPositions: number[]; correctStrokes: number; totalStrokes: number; mistakes: number }>;
}
export type LearningAttemptContext = Pick<Submission, "attemptId" | "kind" | "sourceId">;

let latestScoreChange = 0;
const changeKey = "hsk:scores-updated-at";
export function markLearningScoresUpdated() {
  if (typeof window === "undefined") return;
  latestScoreChange = Date.now();
  try { sessionStorage.setItem(changeKey,String(latestScoreChange)); } catch { /* Timestamp is also kept in memory. */ }
  window.dispatchEvent(new Event("hsk-scores-updated"));
}
export function learningScoresChangedSince(loadedAt:number) {
  if (typeof window === "undefined") return false;
  let saved=0;try {saved=Number(sessionStorage.getItem(changeKey)||0);} catch { /* Storage is optional. */ }
  return Math.max(latestScoreChange,Number.isFinite(saved)?saved:0)>loadedAt;
}
