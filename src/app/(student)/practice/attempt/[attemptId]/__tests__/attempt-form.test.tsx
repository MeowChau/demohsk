import { renderToStaticMarkup } from "react-dom/server";
import { AttemptForm } from "@/components/learning/attempt-form";
import type { TestWithQuestions } from "@/types/assessment";

const data: TestWithQuestions = {
  test: { testid: "set-250", title: "HSK 3 · Ôn từ vựng 26 · Viết (biên soạn)", courseid: "", category: "HSK 3", duration: 0, total_marks: 1, audio_url: "/old-shared-audio.mp3" }, passages: [],
  questionsBySkill: { Writing: [{ question: { questionid: "41", testid: "set-250", passageid: null, question: "Luyện viết: 发烧", skill: "Writing", marks: 1, type: "SHORT_ANSWER", templateId: "write-tracing", pinyin: "fā shāo", audio_url: "/old-word-audio.mp3", image_url: "/sample.png" }, options: [] }] },
};

it("renders Hanzi Writer directly inside a compiled writing lesson instead of audio and textarea", () => {
  const html = renderToStaticMarkup(<AttemptForm attemptid="set-250" testid="set-250" data={data} />);
  expect(html).toContain("Ô luyện viết chữ 发");
  expect(html).toContain("Viết chữ 烧, vị trí 2");
  expect(html).toContain("Xem mẫu");
  expect(html).toContain("fā shāo");
  expect(html).toContain("/sample.png");
  expect(html).not.toContain("<audio");
  expect(html).not.toContain("<textarea");
  expect(html.match(/<form\b/g)).toHaveLength(1);
});

it("keeps typing and listening controls for their own exercise types", () => {
  const mixed: TestWithQuestions = { ...data, questionsBySkill: {
    Writing: [{ ...data.questionsBySkill.Writing![0]!, question: { ...data.questionsBySkill.Writing![0]!.question, templateId: "write-essay", type: "ESSAY", question: "Viết đoạn văn theo yêu cầu." } }],
    Listening: [{ question: { questionid: "42", testid: "set-250", passageid: null, question: "Nghe và chọn đáp án.", skill: "Listening", type: "MULTIPLE_CHOICE", marks: 1, audio_url: "/listening.mp3" }, options: [{ optionid: "A", option_text: "你好" }] }],
  } };
  const html = renderToStaticMarkup(<AttemptForm attemptid="set-250" testid="set-250" data={mixed} />);
  expect(html).toContain("<textarea"); expect(html).toContain("/listening.mp3");
  expect(html).not.toContain("Ô luyện viết chữ");
});

it("does not fall back to typing or audio when a tracing image has no text target", () => {
  const missing: TestWithQuestions = { ...data, questionsBySkill: { Writing: [{ ...data.questionsBySkill.Writing![0]!, question: { ...data.questionsBySkill.Writing![0]!.question, question: "Luyện viết theo mẫu trong ảnh đề gốc." } }] } };
  const html = renderToStaticMarkup(<AttemptForm attemptid="set-250" testid="set-250" data={missing} />);
  expect(html).toContain("chưa có chữ mẫu");
  expect(html).not.toContain("<audio"); expect(html).not.toContain("<textarea");
});
