import { renderToStaticMarkup } from "react-dom/server";
import { AttemptHistoryReview } from "../attempt-history-review";
import type { AttemptHistoryDetail } from "@/lib/learning-history";

function history(size: number): AttemptHistoryDetail {
  const questions = Array.from({length: size}, (_, index) => ({questionId: String(index + 1), status: index % 2 ? "incorrect" as const : "correct" as const, correctAnswers: ["false"]}));
  return {
    id: "saved", kind: "exam", sourceId: 1, title: "Fixture", hskLevel: 1, skills: ["Reading"],
    submittedAt: "2026-11-13T00:00:00Z", durationSeconds: 60, accuracyPercent: 50,
    correctCount: size / 2, gradedCount: size, totalQuestions: size, answeredCount: size, unansweredCount: 0, ungradedCount: 0,
    totalScore: 100, maxScore: 200, passScore: 120, eligible: true, passed: false, reasons: [], gradingStatus: "graded",
    writingProgress: {completed: 0, total: 0, correctStrokes: 0, totalStrokes: 0, mistakes: 0},
    speaking: {score: null, gradedCount: 0, totalCount: 0},
    result: {score: 50, correctCount: size / 2, gradedCount: size, totalQuestions: size, answeredCount: size, unansweredCount: 0, ungradedCount: 0,
      questions, sections: [], totalScore: 100, maxScore: 200, passScore: 120, eligible: true, passed: false, reasons: [],
      currentHskLevel: 1, previousCurrentHskLevel: 1, sourceVersion: "fixture", hskLevel: 1, estimatedHskLevel: 1, previousHskLevel: 1},
    snapshot: {version: 1, answers: Object.fromEntries(questions.map(q => [q.questionId, q.status === "correct" ? "B" : "A"])), writingProgress: {}, speakingAssessments: {},
      source: {kind: "exam", id: 1, level: 1, title: "Fixture", items: questions.map(q => ({id: Number(q.questionId), question: {
        id: Number(q.questionId), skill: "READING", type: "TRUE_FALSE", hskLevel: 1, payload: {text: "判断对错"}, correctAnswer: {answer: false},
      }}))}},
  };
}

it("reviews 240 questions with linear grade lookup instead of per-question full scans", () => {
  const detail = history(240);
  let idReads = 0;
  detail.result.questions.forEach(q => {const id = q.questionId; Object.defineProperty(q, "questionId", {get: () => {idReads++; return id;}});});
  const html = renderToStaticMarkup(<AttemptHistoryReview detail={detail} filter="all"/>);
  expect(html.match(/id="history-question-/g)).toHaveLength(240);
  expect(idReads).toBeLessThan(240 * 5);
  expect(html).toContain("Đáp án B, đã chọn, đúng");
  expect(html).toContain("border-danger bg-danger-soft");
});
it("filters wrong questions without renumbering or mutating the saved snapshot", () => {
  const detail = history(4);
  const html = renderToStaticMarkup(<AttemptHistoryReview detail={detail} filter="wrong"/>);
  expect(html).not.toContain('id="history-question-1"');
  expect(html).toContain('id="history-question-2"');
  expect(html).toContain("Câu 4");
  expect(detail.snapshot.source.items).toHaveLength(4);
});
