import type { HskTopic, PageData } from "@/lib/api/types";
import { CATALOG_PAGE_SIZE } from "@/lib/catalog-query";

const titles = new Intl.Collator("vi", { numeric: true, sensitivity: "base" });
const textbookKey = /^HSK([1-9])-L(\d+)$/i;
const reviewTitle = /^Bài\s+(\d+)\s*:\s*Ôn từ vựng HSK\s+([1-9])(?:\s*\(biên soạn\))?$/iu;

function textbookIdentity(topic: HskTopic) {
  const match = topic.topicKey.match(textbookKey);
  return match && Number(match[1]) === topic.hskLevel ? `${topic.hskLevel}:${Number(match[2])}` : null;
}

function reviewIdentity(topic: HskTopic) {
  const match = topic.topicKey.normalize("NFKC").trim().match(reviewTitle)
    || topic.titleVi?.normalize("NFKC").trim().match(reviewTitle);
  return match && Number(match[2]) === topic.hskLevel
    ? { id: `${topic.hskLevel}:${Number(match[1])}`, number: Number(match[1]) } : null;
}

export function getTextbookTopics(topics: HskTopic[]) {
  return topics.filter(topic => textbookIdentity(topic) !== null);
}

export function getVocabularyTopics(topics: HskTopic[]) {
  const textbooks = new Map(getTextbookTopics(topics).map(topic => [textbookIdentity(topic), topic]));
  return topics.filter(topic => topic.vocabularyCount > 0).map(topic => {
    const review = reviewIdentity(topic);
    const lesson = textbooks.get(textbookIdentity(topic) || review?.id || "");
    const title = lesson?.titleVi || lesson?.titleCn || (review
      ? `HSK ${topic.hskLevel} · Bài ${review.number} bổ sung` : topic.titleVi || topic.titleCn || topic.topicKey);
    // Keep the stored key: vocabulary requests and saved links still use it.
    return { ...topic, titleVi: title.replace(/\s*\(từ vựng\)\s*$/iu, "") + " (từ vựng)",
      titleCn: lesson?.titleCn || topic.titleCn, pinyin: lesson?.pinyin || topic.pinyin };
  });
}

export function vocabularyForLesson(lesson: HskTopic, vocabularyTopics: HskTopic[]) {
  const identity = textbookIdentity(lesson);
  if (!identity) return undefined;
  return vocabularyTopics.find(topic => topic.topicKey === lesson.topicKey)
    || vocabularyTopics.find(topic => reviewIdentity(topic)?.id === identity);
}

export function getVocabularyLessons(topics: HskTopic[]) {
  const lessons = new Set(getTextbookTopics(topics).map(textbookIdentity));
  return getVocabularyTopics(topics).filter(topic => lessons.has(textbookIdentity(topic) || reviewIdentity(topic)?.id || ""));
}

function lessonNumber(topic: HskTopic) {
  const key = topic.topicKey.match(/(?:^|[-_])L(\d+)(?:$|[-_])/i);
  const title = topic.titleVi?.match(/\bbài\s*(\d+)/iu);
  return Number(key?.[1] || title?.[1] || Infinity);
}

export function sortTopics(topics: HskTopic[]) {
  return [...topics].sort((a, b) => {
    const level = a.hskLevel - b.hskLevel;
    if (level) return level;
    const first = lessonNumber(a), second = lessonNumber(b);
    if (first !== second) return first < second ? -1 : 1;
    return titles.compare(a.titleVi || a.titleCn || a.topicKey, b.titleVi || b.titleCn || b.topicKey)
      || titles.compare(a.topicKey, b.topicKey);
  });
}

export function paginateTopics(topics: HskTopic[], requestedPage: number, limit = CATALOG_PAGE_SIZE): PageData<HskTopic> {
  const total = topics.length;
  const totalPages = Math.ceil(total / limit);
  const page = Math.max(1, Math.min(Number.isSafeInteger(requestedPage) ? requestedPage : 1, totalPages || 1));
  return { data: topics.slice((page - 1) * limit, page * limit), total, page, limit, totalPages };
}

export function filterTopics(topics: HskTopic[], search: string) {
  const term = search.toLocaleLowerCase("vi");
  return topics.filter(topic => [topic.titleVi, topic.titleCn, topic.pinyin, topic.topicKey]
    .some(text => (text || "").toLocaleLowerCase("vi").includes(term)));
}
