import "server-only";
import { serverApi } from "./server";
import { catalogSearch, type CatalogQuery } from "@/lib/catalog-query";
import type { HskExam, HskPractice, HskTopic, HskWord, PageData } from "./types";

export const getTopics = (level?: string) => serverApi<HskTopic[]>("practice-sets/topics" + (level ? "?hskLevel=" + level : ""));
export const getWords = (query: Partial<CatalogQuery>) => serverApi<PageData<HskWord>>("vocabulary?" + catalogSearch(query));
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
