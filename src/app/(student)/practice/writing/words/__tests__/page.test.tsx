jest.mock("@/lib/api/catalog", () => ({ getWords: jest.fn(), getTopics: jest.fn() }));
jest.mock("@/components/ui/refresh-button", () => ({ RefreshButton: () => null }));

import { renderToStaticMarkup } from "react-dom/server";
import { getWords, getTopics } from "@/lib/api/catalog";
import WordWritingPage from "../page";
import { WordDeck } from "@/components/learning/word-deck";

const word = { id: 42, hanzi: "学习", pinyin: "xuéxí", meaning: "học tập", hskLevel: 2 };
beforeEach(() => {
  jest.mocked(getWords).mockResolvedValue({ data: [word], total: 1, page: 1, limit: 24, totalPages: 1 });
  jest.mocked(getTopics).mockResolvedValue([]);
});

it("opens a selected vocabulary word on its dedicated practice route", async () => {
  const html = renderToStaticMarkup(await WordWritingPage({ searchParams: Promise.resolve({ hskLevel: "2", word: "42", search: "学习" }) }));
  expect(getWords).toHaveBeenCalledWith(expect.objectContaining({ hskLevel: "2", search: "学习", skill: "" }));
  expect(html).toContain("học tập");
  expect(html).toContain("Ô luyện viết chữ 学");
  expect(html).toContain("Xem danh sách bài luyện viết");
  expect(html).not.toContain("<textarea"); expect(html).not.toContain("<audio");
});

it("connects a vocabulary card directly to its word practice without changing the skill-list route", () => {
  const html = renderToStaticMarkup(<WordDeck words={[word]} ratings={{}} busy={null} onRate={() => {}} />);
  expect(html).toContain("/practice/writing/words?word=42");
  expect(html).toContain("Luyện viết chữ này");
});
