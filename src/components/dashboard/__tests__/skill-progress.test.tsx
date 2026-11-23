/** @jest-environment jsdom */
import { cleanup, render, screen, within } from "@testing-library/react";
import { SkillProgress } from "../skill-progress";
import type { LearningScoreSummary } from "@/lib/learning-scores";

jest.mock("framer-motion", () => {
  const React = jest.requireActual("react");
  return { useInView: () => true, motion: { div: (props: Record<string, unknown>) => React.createElement("div", Object.fromEntries(Object.entries(props).filter(([key]) => !["initial", "animate", "transition", "whileHover"].includes(key)))) } };
});
const empty = { score: null, sampleCount: 0, questionCount: 0, updatedAt: null };
const summary: LearningScoreSummary = { currentHskLevel: 1, estimatedHskLevel: null, evidence: null, hskLevel: 1,
  skills: { Listening: empty, Reading: empty, Writing: empty, Speaking: empty },
  writingProgress: { completed: 0, total: 0, correctStrokes: 0, totalStrokes: 0, mistakes: 0 } };
afterEach(cleanup);

it("shows a single unavailable state without fake zero scores or progress bars", () => {
  render(<SkillProgress summary={summary} />);
  for (const card of screen.getAllByRole("group")) {
    expect(within(card).getAllByText("Chưa đánh giá")).toHaveLength(1);
    expect(within(card).queryByText("—")).toBeNull();
    expect(within(card).queryByText("0.0")).toBeNull();
    expect(within(card).queryByText("Đánh giá")).toBeNull();
    expect(within(card).queryByRole("progressbar")).toBeNull();
  }
});
it("shows a measured score once with both endpoints of the score scale", () => {
  render(<SkillProgress summary={{ ...summary, skills: { ...summary.skills, Listening: { ...empty, score: 72.5, sampleCount: 2 } } }} />);
  const card = within(screen.getByRole("group", { name: "Nghe hiểu · HSK 1" }));
  expect(card.getAllByText("72,5")).toHaveLength(1);
  expect(card.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("72.5");
  for (const tick of ["0", "30", "60", "100"]) expect(card.getByText(tick)).toBeTruthy();
  expect(card.queryByText("Chưa đánh giá")).toBeNull();
});
it("keeps a genuine zero grade distinct from an unassessed skill", () => {
  render(<SkillProgress summary={{ ...summary, skills: { ...summary.skills, Reading: { ...empty, score: 0, sampleCount: 1 } } }} />);
  const card = within(screen.getByRole("group", { name: "Đọc hiểu · HSK 1" }));
  expect(card.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
  expect(card.queryByText("Chưa đánh giá")).toBeNull();
});
it("labels handwriting progress as completed characters instead of inventing an assessment score", () => {
  render(<SkillProgress summary={{ ...summary, writingProgress: { ...summary.writingProgress, completed: 3, total: 10 } }} />);
  const card = within(screen.getByRole("group", { name: "Viết tiếng Trung · HSK 1" }));
  expect(card.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("3 trên 10 chữ đã hoàn thành");
  expect(card.getByText("0%")).toBeTruthy();
  expect(card.queryByText("/100")).toBeNull();
});
