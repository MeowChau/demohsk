import "server-only";
import { serverApi } from "./server";
import { catalogSearch, type CatalogQuery } from "@/lib/catalog-query";
import type { HskExam, HskPractice, HskTopic, HskWord, PageData } from "./types";

export const getTopics = (level?: string) => serverApi<HskTopic[]>("practice-sets/topics" + (level ? "?hskLevel=" + level : ""));
export const getWords = (query: Partial<CatalogQuery>) => serverApi<PageData<HskWord>>("vocabulary?" + catalogSearch({ ...query, view: undefined }));

export async function getLessonWords(query: Partial<CatalogQuery>): Promise<HskWord[]> {
  if (!query.topic) throw new Error("Chọn một chủ đề để học bằng flashcard.");
  const first = await getWords({ ...query, page: 1, limit: 100 });
  const words = new Map(first.data.map(word => [word.id, word]));
  for (let page = 2; page <= first.totalPages; page++) {
    const next = await getWords({ ...query, page, limit: 100 });
    if (next.page !== page) throw new Error("Chưa tải đủ từ của bài học. Vui lòng tải lại.");
    next.data.forEach(word => words.set(word.id, word));
  }
  if (words.size !== first.total) throw new Error("Nội dung bài học vừa thay đổi. Vui lòng tải lại để học đủ từ.");
  return [...words.values()];
}
export const getPracticeSets = (query: Partial<CatalogQuery>) => serverApi<PageData<HskPractice>>("practice-sets?" + catalogSearch(query));
export const getExams = (query: Partial<CatalogQuery>) => serverApi<PageData<HskExam>>("exams?" + catalogSearch(query));

export async function getCatalogOverview() {
  const [words, practices, exams, topics] = await Promise.allSettled([
    getWords({ limit: 1 }), getPracticeSets({ limit: 1 }), getExams({ limit: 1 }), getTopics(),
  ]);
  return {
    words: words.status === "fulfilled" ? words.value.total : null,
    practices: practices.status === "fulfilled" ? practices.value.total : null,
    exams: exams.status === "fulfilled" ? exams.value.total : null,
    topics: topics.status === "fulfilled" ? topics.value : [],
    available: [words, practices, exams, topics].every((result) => result.status === "fulfilled"),
  };
}
