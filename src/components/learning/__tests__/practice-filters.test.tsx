/** @jest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { PracticeFilters } from "../practice-filters";
import { parseCatalogQuery } from "@/lib/catalog-query";
import type { HskTopic } from "@/lib/api/types";

jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));
const push = jest.fn();
const topics: HskTopic[] = [{ id: "1", topicKey: "HSK3-L01", titleCn: "学习", titleVi: "Học tập", pinyin: "xuéxí", hskLevel: 3, totalSets: 1, totalQuestions: 6, vocabularyCount: 10, listeningCount: 0, speakingCount: 0, readingCount: 1, writingCount: 0 }];
beforeEach(() => { push.mockClear(); jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>); });

it.each(["LISTENING", "SPEAKING", "READING", "WRITING", ""])("submits the selected skill %s using its canonical route", skill => {
  const query = parseCatalogQuery({ skill: "READING", page: "4", hskLevel: "3", topic: "HSK3-L01", search: "学习 & 中文" });
  const { container } = render(<PracticeFilters query={query} topics={topics} />);
  fireEvent.change(container.querySelector('select[name="skill"]')!, { target: { value: skill } });
  fireEvent.submit(container.querySelector("form")!);
  const url = new URL(push.mock.calls[0]![0], "http://localhost");
  expect(url.pathname).toBe(skill ? `/practice/${skill.toLowerCase()}` : "/practice");
  expect(url.searchParams.has("skill")).toBe(false);
  expect(Object.fromEntries(url.searchParams)).toEqual({ page: "1", limit: "24", hskLevel: "3", topic: "HSK3-L01", search: "学习 & 中文" });
  expect(screen.getByRole("link", { name: "Đặt lại" }).getAttribute("href")).toBe("/practice/reading");
  expect(container.querySelector("form")!.getAttribute("action")).toBe("/practice");
});
