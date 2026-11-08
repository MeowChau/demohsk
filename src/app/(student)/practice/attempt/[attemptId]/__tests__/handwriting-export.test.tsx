/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import type { HandwritingProgress } from "@/lib/writing-practice";
import type { TestWithQuestions } from "@/types/assessment";
import { AttemptForm } from "../attempt-form";

jest.mock("@/components/learning/hanzi-practice", () => ({ HanziPractice: ({ text, onProgress }: { text: string; onProgress: (progress: HandwritingProgress) => void }) => <button type="button" onClick={() => onProgress({ text, completedPositions: [0, 1], totalCharacters: 2 })}>Hoàn thành luyện nét</button> }));

it("exports handwriting completion separately from typed answers", async () => {
  const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL;
  let exported: Blob | undefined;
  URL.createObjectURL = jest.fn(blob => { exported = blob as Blob; return "blob:practice"; });
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const data: TestWithQuestions = { test: { testid: "set-250", title: "Luyện viết", courseid: "", category: "HSK 3", duration: 0, total_marks: 1, audio_url: null }, passages: [], questionsBySkill: { Writing: [{ question: { questionid: "41", testid: "set-250", passageid: null, question: "Luyện viết: 发烧", skill: "Writing", type: "SHORT_ANSWER", templateId: "write-tracing", marks: 1 }, options: [] }] } };
  try {
    render(<AttemptForm attemptid="set-250" testid="set-250" data={data} />);
    fireEvent.click(screen.getByRole("button", { name: "Hoàn thành luyện nét" }));
    fireEvent.click(screen.getByRole("button", { name: "Tải bài tự luyện của tôi" }));
    const contents = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsText(exported!); });
    expect(JSON.parse(contents)).toEqual({ testid: "set-250", answers: {}, handwriting: { "41": { text: "发烧", completedPositions: [0, 1], totalCharacters: 2 } } });
  } finally { click.mockRestore(); URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke; }
});
