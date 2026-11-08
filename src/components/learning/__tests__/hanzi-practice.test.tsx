/** @jest-environment jsdom */
import { act, fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import HanziWriter from "hanzi-writer";
import type { QuizOptions } from "hanzi-writer";
import { HanziPractice } from "../hanzi-practice";
import { loadHanziData } from "@/lib/hanzi-data";

jest.mock("hanzi-writer", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("@/lib/hanzi-data", () => ({ ...jest.requireActual("@/lib/hanzi-data"), loadHanziData: jest.fn() }));

const instances: Array<{ quiz: jest.Mock; cancelQuiz: jest.Mock; pauseAnimation: jest.Mock; animateCharacter: jest.Mock; showOutline: jest.Mock; hideOutline: jest.Mock; highlightStroke: jest.Mock }> = [];
beforeEach(() => {
  instances.length = 0; jest.clearAllMocks();
  jest.mocked(loadHanziData).mockResolvedValue({ strokes: ["a", "b", "c"], medians: [] });
  jest.mocked(HanziWriter).mockImplementation(() => {
    const instance = { setCharacter: jest.fn().mockResolvedValue(undefined), quiz: jest.fn().mockResolvedValue(undefined), cancelQuiz: jest.fn(), pauseAnimation: jest.fn().mockResolvedValue(undefined), animateCharacter: jest.fn().mockResolvedValue({ canceled: false }), updateDimensions: jest.fn(), showOutline: jest.fn().mockResolvedValue(undefined), hideOutline: jest.fn().mockResolvedValue(undefined), highlightStroke: jest.fn().mockResolvedValue(undefined) };
    instances.push(instance); return instance as unknown as HanziWriter;
  });
});
afterEach(cleanup);

async function ready() { await waitFor(() => expect((screen.getByRole("button", { name: "Xem mẫu" }) as HTMLButtonElement).disabled).toBe(false)); }

it("starts a new board for repeated characters instead of reusing completed strokes", async () => {
  render(<HanziPractice text="妈妈" />); await ready();
  act(() => { const options = instances[0]!.quiz.mock.calls[0]![0] as QuizOptions; options.onComplete?.({ character: "妈", totalMistakes: 0 }); });
  expect(screen.getByText("Đã viết 1/2 chữ trong từ này")).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Chữ tiếp theo" })); await ready();
  expect(instances).toHaveLength(2);
  expect(instances[0]!.cancelQuiz).toHaveBeenCalled();
  expect(screen.getByText("0/3 nét · 0 lần thử chưa khớp")).toBeDefined();
});

it("supports preview, outline toggle, hints and restarting the quiz", async () => {
  render(<HanziPractice text="上" />); await ready();
  fireEvent.click(screen.getByRole("button", { name: "Xem mẫu" })); await ready();
  expect(instances[0]!.animateCharacter).toHaveBeenCalledTimes(1);
  expect(instances[0]!.quiz).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("checkbox", { name: "Hiện chữ mẫu mờ" }));
  expect(instances[0]!.hideOutline).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Gợi ý nét" }));
  expect(instances[0]!.highlightStroke).toHaveBeenCalledWith(0);
  fireEvent.click(screen.getByRole("button", { name: "Viết lại" }));
  expect(instances[0]!.quiz).toHaveBeenCalledTimes(3);
});

it("offers retry after missing data and does not require a text or audio answer", async () => {
  jest.mocked(loadHanziData).mockRejectedValueOnce(new Error("Chưa tải được dữ liệu nét chữ."));
  const { container } = render(<HanziPractice text="上" />);
  await screen.findByRole("button", { name: "Thử lại" });
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" })); await ready();
  expect(loadHanziData).toHaveBeenCalledTimes(2);
  expect(container.querySelector("textarea, input[type=text], audio")).toBeNull();
});

it("reports the completed character positions to the practice lesson", async () => {
  const progress = jest.fn();
  render(<HanziPractice text="发烧" onProgress={progress} />); await ready();
  act(() => { const options = instances[0]!.quiz.mock.calls[0]![0] as QuizOptions; options.onComplete?.({ character: "发", totalMistakes: 0 }); });
  expect(progress).toHaveBeenLastCalledWith({ text: "发烧", completedPositions: [0], totalCharacters: 2 });
  fireEvent.click(screen.getByRole("button", { name: "Chữ tiếp theo" })); await ready();
  act(() => { const options = instances[1]!.quiz.mock.calls[0]![0] as QuizOptions; options.onComplete?.({ character: "烧", totalMistakes: 0 }); });
  expect(progress).toHaveBeenLastCalledWith({ text: "发烧", completedPositions: [0, 1], totalCharacters: 2 });
});
