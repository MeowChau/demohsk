import type { Question } from "@/types/assessment";
import { hanziCharacters } from "./hanzi-data";

export type HandwritingProgress = { text: string; completedPositions: number[]; totalCharacters: number };
export type HandwritingStrokeProgress = { correctStrokes: number; totalStrokes: number; mistakes: number };

export function sameHandwritingStrokes(previous: HandwritingStrokeProgress | null | undefined, next: HandwritingStrokeProgress): boolean {
  return previous?.correctStrokes === next.correctStrokes
    && previous?.totalStrokes === next.totalStrokes
    && previous?.mistakes === next.mistakes;
}

function targetCharacters(value: string): string | null {
  const text = value.trim();
  if (!/^[\p{Script=Han}\s，。、！？,.!?·]+$/u.test(text)) return null;
  const characters = hanziCharacters(text);
  return characters.length > 0 && characters.length <= 64 ? characters.join("") : null;
}

export function writingPractice(question: Pick<Question, "skill" | "type" | "question" | "templateId">): { text: string | null } | null {
  if (question.skill !== "Writing") return null;
  const prompt = question.question.trim();
  // Legacy compiled vocabulary sets also use this public prompt, before templateId existed.
  const labelled = /^(?:Luyện viết|Tập viết|Viết chữ|Viết theo mẫu)\s*[:：]\s*(.+)$/iu.exec(prompt);
  if (question.templateId === "write-tracing")
    return { text: targetCharacters(labelled?.[1] ?? prompt) };
  if (question.type === "ESSAY" || (question.templateId && question.templateId !== "write-tracing")) return null;
  const text = labelled?.[1] ? targetCharacters(labelled[1]) : null;
  return text ? { text } : null;
}
