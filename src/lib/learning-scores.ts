import type { LearningScoreSubmission as Submission } from "./api/generated/learning-contract";
import type { SavedScore } from "./api/generated/learning-contract";
import { ApiError, apiFetch } from "./api/client";
export type { SkillAverage, LearningScoreSummary, SavedScore as SubmittedLearningScore } from "./api/generated/learning-contract";
export interface LearningScoreSubmission extends Omit<Submission, "writingProgress"> {
  writingProgress?: Record<string, { completedPositions: number[]; correctStrokes: number; totalStrokes: number; mistakes: number }>;
}
export type LearningAttemptContext = Pick<Submission, "attemptId" | "kind" | "sourceId">;

let scoreSessionRecovery: Promise<unknown> | null = null;

export async function submitLearningScore(payload: LearningScoreSubmission): Promise<SavedScore> {
  // Serialize once so a recovery sends the exact same attempt ID and answers.
  const body = JSON.stringify(payload);
  const submit = () => apiFetch<SavedScore>("learning-scores/submit", { method: "POST", body });
  try {
    return await submit();
  } catch (cause) {
    if (!(cause instanceof ApiError) || cause.status !== 401) throw cause;
  }

  // Use the existing authenticated endpoint to renew HttpOnly cookies. Multiple
  // score requests in this tab share this recovery; do not retry indefinitely.
  if (!scoreSessionRecovery) {
    scoreSessionRecovery = apiFetch("auth/me").finally(() => { scoreSessionRecovery = null; });
  }
  await scoreSessionRecovery;
  return submit();
}

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
