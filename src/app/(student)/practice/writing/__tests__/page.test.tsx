jest.mock("@/lib/api/catalog", () => ({ getPracticeSets: jest.fn(), getWords: jest.fn(), getTopics: jest.fn() }));
jest.mock("@/components/ui/refresh-button", () => ({ RefreshButton: () => null }));
jest.mock("next/navigation", () => ({ ...jest.requireActual("next/navigation"), useRouter: () => ({ push: jest.fn() }), redirect: jest.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }) }));

import { renderToStaticMarkup } from "react-dom/server";
import { getPracticeSets, getWords, getTopics } from "@/lib/api/catalog";
import { PracticeCatalog } from "@/components/learning/practice-catalog";
import WritingPage from "../page";

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getPracticeSets).mockResolvedValue({ data: [{ id: 250, title: "HSK 3 · Ôn từ vựng 26 · Viết (biên soạn)", skill: "WRITING", hskLevel: 3, topic: "HSK3-26", totalQuestions: 6 }], total: 1, page: 1, limit: 24, totalPages: 1 });
  jest.mocked(getTopics).mockResolvedValue([]);
});

it("opens the writing lesson list before the handwriting exercise", async () => {
  const page = await WritingPage({ searchParams: Promise.resolve({ hskLevel: "3", topic: "HSK3-26" }) });
  expect(page.type).toBe(PracticeCatalog);
  const html = renderToStaticMarkup(await PracticeCatalog(page.props));
  expect(getPracticeSets).toHaveBeenCalledWith(expect.objectContaining({ skill: "WRITING", hskLevel: "3", topic: "HSK3-26" }));
  expect(getWords).not.toHaveBeenCalled();
  expect(html).toContain("Ôn từ vựng 26");
  expect(html).toContain('/practice/sets/250/attempt');
  expect(html).toContain("Mở bài luyện");
  expect(html).not.toContain("Ô luyện viết chữ");
});

it("normalizes redundant skill query parameters to the writing path", async () => {
  await expect(WritingPage({ searchParams: Promise.resolve({ word: "42", skill: "LISTENING", page: "2" }) })).rejects.toThrow("REDIRECT:/practice/writing?page=2&limit=24");
  expect(getWords).not.toHaveBeenCalled();
  expect(getPracticeSets).not.toHaveBeenCalled();
});
