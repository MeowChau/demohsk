/** @jest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AttemptForm } from "../../attempt-form";
import { StartExamButton, StartPracticeButton } from "../../start-attempt-button";
import { createAttemptStore } from "../attempt-store";
import { apiFetch } from "@/lib/api/client";
import { parseGradingMode, scorePracticeAttempt, type GradingMode } from "@/lib/practice-scoring";
import type { TestWithQuestions } from "@/types/assessment";

const push = jest.fn();
const router = { push, refresh: jest.fn() };
jest.mock("next/navigation", () => ({ useRouter: () => router }));
jest.mock("@/lib/api/client", () => ({ ...jest.requireActual("@/lib/api/client"), apiFetch: jest.fn() }));

const data: TestWithQuestions = {
  test: { testid: "set-7", title: "Luyện từ vựng", courseid: "", category: "HSK 1", duration: 0, total_marks: 2, audio_url: null }, passages: [],
  questionsBySkill: { Reading: [
    { question: { questionid: "11", testid: "set-7", passageid: null, question: "Chọn nghĩa lời chào", skill: "Reading", type: "MULTIPLE_CHOICE", marks: 1, acceptedAnswers: ["A"] },
      options: [{ optionid: "A", option_text: "Xin chào" }, { optionid: "B", option_text: "Tạm biệt" }] },
    { question: { questionid: "12", testid: "set-7", passageid: null, question: "Viết lời chào bằng tiếng Trung", skill: "Reading", type: "FILL_IN_BLANK", marks: 1, acceptedAnswers: ["你好"] }, options: [] },
  ] },
};

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.open = false; } });
});
beforeEach(() => { jest.clearAllMocks(); });
afterEach(() => { cleanup(); jest.useRealTimers(); });
function mount(mode: GradingMode, recordScores = false) {
  return render(<AttemptForm attemptid="set-7" testid="set-7" data={data} initialGradingMode={mode} recordScores={recordScores} />);
}
function firstQuestion() { return within(document.getElementById("practice-question-11")!); }
function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));
  fireEvent.click(within(screen.getByRole("dialog", { name: "Xác nhận nộp bài?" })).getByRole("button", { name: "Nộp bài" }));
}

it("submits from the end of a practice set through the same confirmation dialog", () => {
  mount("on-submit");
  fireEvent.click(firstQuestion().getByRole("radio", { name: "A. Xin chào" }));
  fireEvent.click(screen.getByRole("button", { name: "Nộp bài luyện tập" }));
  const confirmation = within(screen.getByRole("dialog", { name: "Xác nhận nộp bài?" }));
  expect(screen.queryByRole("region", { name: "Kết quả luyện tập" })).toBeNull();
  expect((firstQuestion().getByRole("radio", { name: "A. Xin chào" }) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(confirmation.getByRole("button", { name: "Nộp bài" }));
  expect(screen.getByRole("region", { name: "Kết quả luyện tập" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Nộp bài luyện tập" })).toBeNull();
});

it("uses the same accessible mode popup before opening a practice set", () => {
  render(<StartPracticeButton setId={7} title="Bài luyện 7" />);
  fireEvent.click(screen.getByRole("link", { name: "Mở bài luyện" }));
  const dialog = within(screen.getByRole("dialog", { name: "Chọn cách làm bài" }));
  expect((dialog.getByRole("radio", { name: /Chấm khi nộp bài/ }) as HTMLInputElement).checked).toBe(true);
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(dialog.getByRole("radio", { name: /Chấm ngay từng câu/ }));
  fireEvent.click(dialog.getByRole("button", { name: "Bắt đầu làm bài" }));
  expect(push).toHaveBeenCalledWith("/practice/sets/7/attempt?grading=per-question");
});

it("combines exam timing and grading choices without navigating for an invalid duration", () => {
  render(<StartExamButton examId="2" level={2} title="HSK 2" />);
  fireEvent.click(screen.getByRole("button", { name: "Bắt đầu làm bài" }));
  const dialog = within(screen.getByRole("dialog", { name: "Chọn cách làm bài" }));
  const minutes = dialog.getByLabelText("Thời gian (phút)");
  fireEvent.change(minutes, { target: { value: "181" } });
  fireEvent.click(dialog.getByRole("button", { name: "Bắt đầu làm bài" }));
  expect(push).not.toHaveBeenCalled();
  expect(dialog.getByText(/Vui lòng nhập thời gian/)).toBeTruthy();
  fireEvent.change(minutes, { target: { value: "55" } });
  fireEvent.click(dialog.getByRole("button", { name: "Bắt đầu làm bài" }));
  expect(push).toHaveBeenCalledWith("/exams/2/attempt?grading=on-submit&duration=55");
});

it("hides correctness until submission in on-submit mode and allows changing the answer", () => {
  mount("on-submit");
  const question = firstQuestion();
  fireEvent.click(question.getByRole("radio", { name: "B. Tạm biệt" }));
  expect(question.queryByText(/Chưa chính xác/)).toBeNull();
  expect(question.queryByText("Chính xác")).toBeNull();
  fireEvent.click(question.getByRole("radio", { name: "A. Xin chào" }));
  expect((question.getByRole("radio", { name: "A. Xin chào" }) as HTMLInputElement).checked).toBe(true);
  expect(apiFetch).not.toHaveBeenCalled();
  submit();
  expect(screen.getByRole("region", { name: "Kết quả luyện tập" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Xem lại bài làm" }));
  expect(question.getByText("Chính xác")).toBeTruthy();
});

it("immediately grades a selected choice, locks it and updates the grid without saving a history per question", () => {
  mount("per-question");
  const question = firstQuestion();
  fireEvent.click(question.getByRole("radio", { name: "B. Tạm biệt" }));
  expect(question.getByText("Chưa chính xác. Đáp án: A. Xin chào")).toBeTruthy();
  const wrong = question.getByRole("radio", { name: "B. Tạm biệt" }) as HTMLInputElement;
  expect(wrong.disabled).toBe(true);
  expect(wrong.closest("label")?.className).toContain("border-danger");
  expect(question.getByRole("radio", { name: "A. Xin chào" }).closest("label")?.className).toContain("border-success");
  fireEvent.click(question.getByRole("radio", { name: "A. Xin chào" }));
  expect(wrong.checked).toBe(true);
  expect(screen.getByText(/Đã chấm 1 câu · Đúng 0\/1/)).toBeTruthy();
  expect(apiFetch).not.toHaveBeenCalled();
});

it("checks typed text only on explicit confirmation and reuses answer normalization", () => {
  mount("per-question");
  const question = within(document.getElementById("practice-question-12")!);
  const input = question.getByRole("textbox") as HTMLTextAreaElement;
  const check = question.getByRole("button", { name: "Kiểm tra câu này" }) as HTMLButtonElement;
  expect(check.disabled).toBe(true);
  fireEvent.change(input, { target: { value: " 你好！ " } });
  expect(question.queryByText("Chính xác")).toBeNull();
  expect(input.disabled).toBe(false);
  fireEvent.click(check);
  expect(question.getByText("Chính xác")).toBeTruthy();
  expect(input.disabled).toBe(true);
  expect(screen.getByText(/Đã chấm 1 câu · Đúng 1\/1/)).toBeTruthy();
});

it("does not fabricate instant grades when a source has no answer key", () => {
  const source = { ...data, questionsBySkill: { Reading: [{ ...data.questionsBySkill.Reading![0]!, question: { ...data.questionsBySkill.Reading![0]!.question, acceptedAnswers: [] } }] } };
  render(<AttemptForm attemptid="set-7" testid="set-7" data={source} initialGradingMode="per-question" />);
  const question = firstQuestion();
  fireEvent.click(question.getByRole("radio", { name: "B. Tạm biệt" }));
  expect(question.queryByText(/Chưa chính xác/)).toBeNull();
  expect((question.getByRole("radio", { name: "A. Xin chào" }) as HTMLInputElement).disabled).toBe(false);
  expect(question.getByText(/chưa có đáp án chấm ngay/)).toBeTruthy();
  expect(screen.queryByText(/Đã chấm 1 câu/)).toBeNull();
});

it("waits for mode confirmation before starting the timer on a direct exam link", () => {
  jest.useFakeTimers();
  const exam = { ...data, test: { ...data.test, testid: "exam-1", duration: 1 } };
  render(<AttemptForm attemptid="exam-1" testid="exam-1" data={exam} recordScores />);
  act(() => { jest.advanceTimersByTime(120000); });
  expect(screen.queryByText(/Còn lại/)).toBeNull();
  expect(apiFetch).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole("dialog", { name: "Chọn cách làm bài" })).getByRole("button", { name: "Bắt đầu làm bài" }));
  expect(screen.getByText("Còn lại 01:00")).toBeTruthy();
  expect(apiFetch).not.toHaveBeenCalled();
});

it("saves the final attempt once, preserving the initially graded choice and resetting it for a retake", async () => {
  const local = scorePracticeAttempt(data.questionsBySkill.Reading!, { "11": "B" });
  jest.mocked(apiFetch).mockResolvedValue({ ...local, currentHskLevel: 1, previousCurrentHskLevel: 1 });
  mount("per-question", true);
  fireEvent.click(firstQuestion().getByRole("radio", { name: "B. Tạm biệt" }));
  expect(apiFetch).not.toHaveBeenCalled();
  submit();
  await waitFor(() => expect(screen.getByText("Đã cập nhật điểm kỹ năng")).toBeTruthy());
  expect(apiFetch).toHaveBeenCalledTimes(1);
  expect(apiFetch).toHaveBeenCalledWith("learning-scores/submit", expect.objectContaining({ body: expect.any(String) }));
  expect(JSON.parse(jest.mocked(apiFetch).mock.calls[0]![1]!.body as string).answers).toEqual({ "11": "B" });
  fireEvent.click(screen.getByRole("button", { name: "Làm lại" }));
  const dialog = within(screen.getByRole("dialog", { name: "Chọn cách làm bài" }));
  fireEvent.click(dialog.getByRole("radio", { name: /Chấm khi nộp bài/ }));
  fireEvent.click(dialog.getByRole("button", { name: "Bắt đầu làm bài" }));
  expect((firstQuestion().getByRole("radio", { name: "B. Tạm biệt" }) as HTMLInputElement).checked).toBe(false);
  expect((firstQuestion().getByRole("radio", { name: "B. Tạm biệt" }) as HTMLInputElement).disabled).toBe(false);
  expect(firstQuestion().queryByText(/Chưa chính xác/)).toBeNull();
});

it("announces a saved attempt once and keeps the JSON backup action explicit", async () => {
  const local = scorePracticeAttempt(data.questionsBySkill.Reading!, { "11": "A" });
  jest.mocked(apiFetch).mockResolvedValue({ ...local, historyId: "saved-attempt", currentHskLevel: 1, previousCurrentHskLevel: 1 });
  mount("on-submit", true);
  fireEvent.click(firstQuestion().getByRole("radio", { name: "A. Xin chào" }));
  submit();
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Đã lưu vào lịch sử"));
  expect(screen.getAllByText(/Đã lưu/)).toHaveLength(1);
  expect(screen.queryByText(/Điểm đã được lưu vào phần tổng hợp/)).toBeNull();
  expect(screen.getByRole("link", { name: "Xem lại bài làm" }).getAttribute("href")).toBe("/results/saved-attempt");
  expect(screen.getByRole("button", { name: "Tải bản sao bài làm (.json)" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Tải bài tự luyện của tôi" })).toBeNull();
});

it("keeps instant grades local to each attempt and clears them on reset", () => {
  const first = createAttemptStore(), second = createAttemptStore();
  first.getState().setField("checkedQuestions", { "11": { questionId: "11", status: "incorrect", correctAnswers: ["A"] } });
  expect(second.getState().checkedQuestions).toEqual({});
  first.getState().reset();
  expect(first.getState().checkedQuestions).toEqual({});
  expect(parseGradingMode("per-question")).toBe("per-question");
  expect(parseGradingMode("on-submit")).toBe("on-submit");
  expect(parseGradingMode(["per-question"])).toBeUndefined();
  expect(parseGradingMode("unexpected")).toBeUndefined();
});
