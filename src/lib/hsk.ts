import type { Skill } from "@/types/assessment";

export const SKILL_LABELS: Record<Skill, string> = {
  Listening: "Nghe hiểu",
  Reading: "Đọc hiểu",
  Writing: "Viết tiếng Trung",
  Speaking: "Luyện nói",
};

export const HSK_LEVELS = Array.from({ length: 9 }, (_, index) => index + 1);
export function validHskLevel(value: unknown): number | null {
  return typeof value === "number" && HSK_LEVELS.includes(value) ? value : null;
}
export const STUDY_MODULES = {
  vocabulary: "vocabulary_review",
  Listening: "practice_listening",
  Reading: "practice_reading",
  Speaking: "practice_speaking",
  Writing: "practice_writing",
  exam: "hsk_exam",
} as const;
export type StudyModule = typeof STUDY_MODULES[keyof typeof STUDY_MODULES];
