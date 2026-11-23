import "server-only";
import { cache } from "react";
import { backendEndpoint, publicMedia } from "./config";
import { ApiError, errorMessage } from "./client";
import { serverApi } from "./server";
import { CATALOG_PAGE_SIZE, catalogSearch, hskLevelPriority, type CatalogQuery } from "@/lib/catalog-query";
import type { DashboardTopic, HskExam, HskPractice, HskTopic, HskWord, PageData } from "./types";

export const getTopics = cache((level?: string) => serverApi<HskTopic[]>("practice-sets/topics" + (level ? "?hskLevel=" + level : "")));
// Count the same complete topic catalog as the lesson page, while keeping
// up to ten actionable practice topics at the student's current HSK level.
export async function getDashboardTopics(level: number): Promise<{ topics: DashboardTopic[]; total: number }> {
  const topics = await getTopics();
  return {
    total: topics.length,
    topics: topics.filter(topic => topic.hskLevel === level && topic.totalSets > 0 && topic.totalQuestions > 0).slice(0, 10).map(({ topicKey, titleVi, titleCn, hskLevel, totalSets }) => ({
      topicKey, titleVi, titleCn, hskLevel, totalSets,
    })),
  };
}
const requestPage = cache(<T>(path:string) => serverApi<PageData<T>>(path));
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
  const load: CatalogLoader<HskWord> = next => requestPage<HskWord>("vocabulary?" + catalogSearch({ ...next, view: undefined }));
  return currentLevel === undefined ? load(query) : personalizedPage(load, query, currentLevel);
};

function wordAudioKey(word: Pick<HskWord, "hanzi" | "pinyin" | "hskLevel">): string {
  // Preserve tone marks to distinguish different readings of the same Hanzi.
  return word.hskLevel + "|" + word.hanzi.normalize("NFKC").replace(/\s+/gu, "") + "|" + word.pinyin.normalize("NFKC").replace(/\s+/gu, "").toLowerCase();
}

async function lessonWordAudio(query: Partial<CatalogQuery>): Promise<Map<string, string>> {
  const audio = new Map<string, string>();
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page++) {
    const result = await getPracticeSets({ topic: query.topic, hskLevel: query.hskLevel, skill: "SPEAKING", page, limit: 100 });
    if (result.page !== page) throw new Error("Chưa tải đủ âm thanh của bài học.");
    totalPages = result.totalPages;
    for (const set of result.data) {
      if (set.topic !== query.topic || set.skill !== "SPEAKING") continue;
      for (const { question } of set.practiceSetQuestions || []) {
        if (!question || question.skill !== "SPEAKING") continue;
        const payload = question.payload;
        const hanzi = payload.source?.sourceWord || payload.hanzi || payload.character;
        const src = publicMedia(payload.audioUrl);
        if (!hanzi || !payload.pinyin || !src || payload.audioScope === "source-track") continue;
        audio.set(wordAudioKey({ hanzi, pinyin: payload.pinyin, hskLevel: question.hskLevel }), src);
      }
    }
  }
  return audio;
}

export async function getLessonWords(query: Partial<CatalogQuery>, { withAudio = false }: { withAudio?: boolean } = {}): Promise<HskWord[]> {
  if (!query.topic) throw new Error("Chọn một chủ đề để học bằng flashcard.");
  const [first, audio] = await Promise.all([
    getWords({ ...query, page: 1, limit: 100 }),
    // Optional audio must not prevent reading or reviewing the vocabulary.
    withAudio ? lessonWordAudio(query).catch(() => new Map<string, string>()) : Promise.resolve(new Map<string, string>()),
  ]);
  const words = new Map(first.data.map(word => [word.id, word]));
  for (let page = 2; page <= first.totalPages; page++) {
    const next = await getWords({ ...query, page, limit: 100 });
    if (next.page !== page) throw new Error("Chưa tải đủ từ của bài học. Vui lòng tải lại.");
    next.data.forEach(word => words.set(word.id, word));
  }
  if (words.size !== first.total) throw new Error("Nội dung bài học vừa thay đổi. Vui lòng tải lại để học đủ từ.");
  return [...words.values()].map(word => withAudio ? { ...word, audioUrl: publicMedia(word.audioUrl) || audio.get(wordAudioKey(word)) || null } : word);
}
export const getPracticeSets = (query: Partial<CatalogQuery>, currentLevel?: number | null) => {
  const load: CatalogLoader<HskPractice> = next => requestPage<HskPractice>("practice-sets?" + catalogSearch(next));
  return currentLevel === undefined ? load(query) : personalizedPage(load, query, currentLevel);
};
export const getExams = (query: Partial<CatalogQuery>, currentLevel?: number | null) => {
  const load: CatalogLoader<HskExam> = next => requestPage<HskExam>("exams?" + catalogSearch(next));
  return currentLevel === undefined ? load(query) : personalizedPage(load, query, currentLevel);
};

async function publicCatalog<T>(path: "vocabulary?limit=1" | "practice-sets?limit=1" | "exams?limit=1" | "practice-sets/topics"): Promise<T> {
  const response = await fetch(backendEndpoint(path), {
    method:"GET", next:{revalidate:60,tags:["hsk-public-catalog"]}, signal:AbortSignal.timeout(15000),
  });
  const body:unknown = await response.json().catch(()=>null);
  if(!response.ok) throw new ApiError(errorMessage(body,response.status),response.status);
  return body as T;
}
export async function getCatalogOverview() {
  const [words, practices, exams, topics] = await Promise.allSettled([
    publicCatalog<PageData<HskWord>>("vocabulary?limit=1"), publicCatalog<PageData<HskPractice>>("practice-sets?limit=1"), publicCatalog<PageData<HskExam>>("exams?limit=1"), publicCatalog<HskTopic[]>("practice-sets/topics"),
  ]);
  return {
    words: words.status === "fulfilled" ? words.value.total : null,
    practices: practices.status === "fulfilled" ? practices.value.total : null,
    exams: exams.status === "fulfilled" ? exams.value.total : null,
    topics: topics.status === "fulfilled" ? topics.value : [],
    available: [words, practices, exams, topics].every((result) => result.status === "fulfilled"),
  };
}
