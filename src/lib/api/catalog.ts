import "server-only";
import { serverApi } from "./server";
import { CATALOG_PAGE_SIZE, catalogSearch, hskLevelPriority, type CatalogQuery } from "@/lib/catalog-query";
import type { HskExam, HskPractice, HskTopic, HskWord, PageData } from "./types";

export const getTopics = (level?: string) => serverApi<HskTopic[]>("practice-sets/topics" + (level ? "?hskLevel=" + level : ""));
type CatalogLoader<T> = (query: Partial<CatalogQuery>) => Promise<PageData<T>>;

// Read only the level buckets needed for this page. Sorting a single backend
// page would miss closer HSK levels; loading the whole vocabulary would be wasteful.
async function personalizedPage<T>(load: CatalogLoader<T>, query: Partial<CatalogQuery>, currentLevel: number | null): Promise<PageData<T>> {
  const limit = query.limit || CATALOG_PAGE_SIZE;
  const requested = Number.isSafeInteger(query.page) && query.page! > 0 ? query.page! : 1;
  if (query.hskLevel) {
    const result = await load({ ...query, limit, page: requested });
    const page = Math.min(requested, Math.max(1, result.totalPages));
    return page === requested ? result : load({ ...query, limit, page });
  }
  const summary = await load({ ...query, page: 1, limit: 1 });
  const total = summary.total;
  const totalPages = Math.ceil(total / limit);
  const page = Math.min(requested, Math.max(1, totalPages));
  const needed = Math.min(limit, total - (page - 1) * limit);
  let skip = (page - 1) * limit;
  const data: T[] = [];
  for (const level of hskLevelPriority(currentLevel)) {
    if (data.length >= needed) break;
    const bucketQuery = { ...query, hskLevel: String(level), limit };
    const first = await load({ ...bucketQuery, page: 1 });
    if (skip >= first.total) { skip -= first.total; continue; }
    let offset = skip;
    while (offset < first.total && data.length < needed) {
      const bucketPage = Math.floor(offset / limit) + 1;
      const batch = bucketPage === 1 ? first : await load({ ...bucketQuery, page: bucketPage });
      const start = offset % limit;
      const count = Math.min(needed - data.length, first.total - offset, batch.data.length - start);
      if (batch.page !== bucketPage || count <= 0) throw new Error("Danh sách vừa thay đổi. Vui lòng tải lại để xem đủ nội dung.");
      data.push(...batch.data.slice(start, start + count));
      offset += count;
    }
    skip = 0;
  }
  if (data.length !== needed) throw new Error("Danh sách vừa thay đổi. Vui lòng tải lại để xem đủ nội dung.");
  return { data, total, page, limit, totalPages };
}

export const getWords = (query: Partial<CatalogQuery>, currentLevel?: number | null) => {
  const load: CatalogLoader<HskWord> = next => serverApi("vocabulary?" + catalogSearch({ ...next, view: undefined }));
  return currentLevel === undefined ? load(query) : personalizedPage(load, query, currentLevel);
};

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
export const getPracticeSets = (query: Partial<CatalogQuery>, currentLevel?: number | null) => {
  const load: CatalogLoader<HskPractice> = next => serverApi("practice-sets?" + catalogSearch(next));
  return currentLevel === undefined ? load(query) : personalizedPage(load, query, currentLevel);
};
export const getExams = (query: Partial<CatalogQuery>, currentLevel?: number | null) => {
  const load: CatalogLoader<HskExam> = next => serverApi("exams?" + catalogSearch(next));
  return currentLevel === undefined ? load(query) : personalizedPage(load, query, currentLevel);
};

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
