import { writingPractice } from "../writing-practice";
import type { Question } from "@/types/assessment";

const base: Pick<Question, "skill" | "type" | "templateId" | "question"> = { skill: "Writing", type: "SHORT_ANSWER", templateId: "write-tracing", question: "Luyện viết: 发烧" };

it("recognizes the compiled writing prompt from the real HSK 3 lesson", () => {
  expect(writingPractice(base)).toEqual({ text: "发烧" });
  expect(writingPractice({ ...base, question: "Luyện viết：检票" })).toEqual({ text: "检票" });
});

it("supports older vocabulary-writing prompts without template metadata", () => {
  expect(writingPractice({ ...base, templateId: undefined })).toEqual({ text: "发烧" });
});

it("keeps repeated characters and accepts a bare character in a tracing template", () => {
  expect(writingPractice({ ...base, question: "Tập viết: 妈妈" })).toEqual({ text: "妈妈" });
  expect(writingPractice({ ...base, question: "上" })).toEqual({ text: "上" });
});

it.each([
  { skill: "Reading" as const },
  { skill: "Listening" as const },
  { templateId: "write-essay", type: "ESSAY" },
  { templateId: "write-short-answer" },
  { templateId: undefined, question: "用朋友写一句话" },
])("preserves other exercise types %j", change => {
  expect(writingPractice({ ...base, ...change })).toBeNull();
});

it("does not invent a handwriting target from an image-only or mixed-language instruction", () => {
  expect(writingPractice({ ...base, question: "Luyện viết theo mẫu trong ảnh đề gốc." })).toEqual({ text: null });
  expect(writingPractice({ ...base, question: "Luyện viết: Hãy viết chữ 发烧" })).toEqual({ text: null });
});
