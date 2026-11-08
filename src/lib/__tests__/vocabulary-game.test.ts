import { vocabularyQuestions } from "../vocabulary-game";
import type { HskWord } from "../api/types";
const words: HskWord[] = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, hanzi: "词" + index, pinyin: "cí", meaning: "nghĩa " + index, hskLevel: 1 }));
describe("vocabulary game data", () => {
  it("uses published words and exactly one correct choice per question", () => {
    const result = vocabularyQuestions(words);
    expect(result).toHaveLength(10);
    for (const item of result) {
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices.map(option => option.meaning)).size).toBe(4);
      expect(item.choices.filter(option => option.id === item.word.id)).toEqual([{ id: item.word.id, meaning: item.word.meaning }]);
    }
  });
  it("does not invent distractors when the catalog is too small", () => expect(vocabularyQuestions(words.slice(0, 3))).toEqual([]));
  it("deduplicates repeated definitions", () => expect(vocabularyQuestions(words.map(word => ({ ...word, meaning: "same" })))).toEqual([]));
  it("keeps the first render deterministic to avoid hydration mismatches", () => expect(vocabularyQuestions(words)).toEqual(vocabularyQuestions(words)));
});
