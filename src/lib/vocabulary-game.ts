import type { HskWord } from "./api/types";
export type WordQuestion = { word: HskWord; choices: { id: number; meaning: string }[] };
export function vocabularyQuestions(words: HskWord[]): WordQuestion[] {
  const unique = [...new Map(words.filter(word => word.hanzi.trim() && word.meaning.trim()).map(word => [word.meaning.trim().toLocaleLowerCase(), word])).values()];
  if (unique.length < 4) return [];
  return unique.slice(0, 10).map((word, index) => {
    const choices = [word, unique[(index + 1) % unique.length]!, unique[(index + 2) % unique.length]!, unique[(index + 3) % unique.length]!].map(item => ({ id: item.id, meaning: item.meaning }));
    const rotation = word.id % choices.length;
    return { word, choices: [...choices.slice(rotation), ...choices.slice(0, rotation)] };
  });
}
