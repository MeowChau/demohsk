import { questionOptions } from "./api/question-adapter";
import { formatScore } from "./utils";
import type { SubmittedLearningScore } from "./learning-scores";
import type { PronunciationAssessment } from "./api/types";
import type { SearchParams } from "./catalog-query";
import type { Skill } from "@/types/assessment";

export interface AttemptHistorySummary {
  id: string; kind: "exam" | "set"; sourceId: number; title: string; hskLevel: number; skills: Skill[];
  submittedAt: string; durationSeconds: number | null; accuracyPercent: number | null;
  correctCount: number; gradedCount: number; totalQuestions: number; answeredCount: number; unansweredCount: number; ungradedCount: number;
  totalScore: number | null; maxScore: number; passScore: number | null; eligible: boolean; passed: boolean; reasons: string[];
  gradingStatus: "graded" | "partial" | "ungraded";
  writingProgress: { completed: number; total: number; correctStrokes: number; totalStrokes: number; mistakes: number };
  speaking: { score: number | null; gradedCount: number; totalCount: number };
}
export interface HistorySourceItem {
  id: number; audioUrl?: string | null;
  question: { id: number; skill: string; type: string; hskLevel: number; payload: Record<string, unknown>; correctAnswer: Record<string, unknown> | null } | null;
}
export interface AttemptHistoryDetail extends AttemptHistorySummary {
  result: SubmittedLearningScore;
  snapshot: {
    version: 1;
    source: { kind: "exam" | "set"; id: number; level: number; title: string; items: HistorySourceItem[] };
    answers: Record<string, string>;
    writingProgress: Record<string, { completedPositions: number[]; totalCharacters: number; correctStrokes: number; totalStrokes: number; mistakes: number }>;
    speakingAssessments: Record<string, PronunciationAssessment>;
  };
}
export type HistoryQuery = { page: number; limit: number; kind: string; sourceId: string; hskLevel: string; skill: string; search: string; from: string; to: string };
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || "";
export function parseHistoryQuery(params: SearchParams): HistoryQuery {
  const page = Number(first(params.page));
  const kind = first(params.kind);
  const skill = first(params.skill).toUpperCase();
  const sourceId = first(params.sourceId);
  const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value ? value : "";
  return {
    page: Number.isSafeInteger(page) && page > 0 && page <= 1000000 ? page : 1, limit: 10,
    kind: ["exam", "set"].includes(kind) ? kind : "",
    sourceId: /^\d+$/.test(sourceId) && Number(sourceId) > 0 && Number(sourceId) <= 2147483647 ? sourceId : "",
    hskLevel: /^[1-9]$/.test(first(params.hskLevel)) ? first(params.hskLevel) : "",
    skill: ["LISTENING", "READING", "WRITING", "SPEAKING"].includes(skill) ? skill : "",
    search: first(params.search).trim().slice(0, 200), from: date(first(params.from)), to: date(first(params.to)),
  };
}
export function historySearch(query: Partial<HistoryQuery>) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== "" && value !== undefined) params.set(key, String(value)); });
  return params.toString();
}
export function historyHref(query: Partial<HistoryQuery> = {}) {
  const search = historySearch(query);
  return "/history" + (search ? "?" + search : "");
}
export const historyResultHref = (id: string) => "/results/" + encodeURIComponent(id);
export const historyDate = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
export function historyDuration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return Math.floor(seconds) + " giây";
  const remainder = Math.floor(seconds % 60);
  return Math.floor(seconds / 60) + " phút" + (remainder ? " " + remainder + " giây" : "");
}
export function historyMetric(item: AttemptHistorySummary) {
  if (item.gradedCount > 0) return `${item.correctCount}/${item.gradedCount} câu đúng · ${item.accuracyPercent === null ? "—" : formatScore(item.accuracyPercent) + "%"}`;
  if (item.speaking.gradedCount > 0) return `${item.speaking.score === null ? "—" : formatScore(item.speaking.score)}/100 · ${item.speaking.gradedCount}/${item.speaking.totalCount} câu nói đã chấm`;
  if (item.writingProgress.total > 0) return `${item.writingProgress.correctStrokes}/${item.writingProgress.totalStrokes} nét đúng · ${item.writingProgress.completed}/${item.writingProgress.total} chữ`;
  return "Tự luyện · chưa chấm tự động";
}
export function historyText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : fallback;
}
export function historyOptions(item: HistorySourceItem) {
  return questionOptions(item.question?.payload || {}, item.question?.type || "");
}
