import { z } from "zod";
const skill = z.enum(["LISTENING", "READING", "WRITING", "SPEAKING"]);
const payload = z.object({
  templateId: z.string().optional(), text: z.string().optional(), sentence: z.string().optional(),
  questionText: z.string().optional(), character: z.string().optional(), hanzi: z.string().optional(),
  meaning: z.string().optional(), pinyin: z.string().optional(), translation: z.string().optional(),
  source: z.object({ sourceWord: z.string().optional() }).passthrough().optional(),
  imageUrl: z.string().optional(), contextImageUrl: z.string().optional(), continuationImageUrl: z.string().optional(),
  audioUrl: z.string().optional(), audioScope: z.string().optional(), audioTimestamp: z.number().optional(),
  options: z.array(z.unknown()).optional(), optionImages: z.array(z.unknown()).optional(),
  manualGrading: z.boolean().optional(), reviewRequired: z.boolean().optional(), correctOptionId: z.string().optional(),
}).passthrough();
const question = z.object({ id: z.number().int().positive(), type: z.string(), skill, hskLevel: z.number().int().min(1).max(9), payload,
  correctAnswer: z.record(z.unknown()).nullable().optional() });
const link = z.object({ questionId: z.number().int().positive().optional(), order: z.number().int().default(0), question: question.nullable() });
const source = { id: z.number().int().positive(), title: z.string(), hskLevel: z.number().int().min(1).max(9) };
export const practiceSchema = z.object({ ...source, skill, topic: z.string().default(""), audioUrl: z.string().nullish().transform(x => x ?? undefined), practiceSetQuestions: z.array(link).default([]) });
export const examSchema = z.object({ ...source, description: z.string().nullish().transform(x => x ?? undefined), sections: z.array(z.object({
  id: z.number().int().positive(), title: z.string(), order: z.number().int().default(0), audioUrl: z.string().nullish().transform(x => x ?? undefined), sectionQuestions: z.array(link).default([]),
})).default([]) });
export function byOrder<T extends { order?: number }>(items: readonly T[]): T[] {
  return items.map((value,index) => ({value,index})).sort((a,b) => (a.value.order ?? 0) - (b.value.order ?? 0) || a.index - b.index).map(x => x.value);
}
export function publicText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : fallback;
}
export function questionOptions(payload: Record<string, unknown>, type: string) {
  const raw = Array.isArray(payload.options) ? payload.options : [];
  const images = Array.isArray(payload.optionImages) ? payload.optionImages : [];
  const options = Array.from({length: Math.max(raw.length, images.length)}, (_,i) => {
    const value = raw[i];
    const option = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string,unknown> : {};
    const id = publicText(option.id ?? option.optionId ?? option.label, String.fromCharCode(65+i));
    return { id, text: typeof value === "string" ? value : publicText(option.text ?? option.label, id), imageUrl: publicText(option.imageUrl) || publicText(images[i]) };
  });
  return type === "TRUE_FALSE" && !options.length ? [{id:"A",text:"\u5bf9 \u00b7 \u0110\u00fang",imageUrl:""},{id:"B",text:"\u9519 \u00b7 Sai",imageUrl:""}] : options;
}
