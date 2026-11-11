import type { HskTopic, PageData } from "@/lib/api/types";

const titles = new Intl.Collator("vi", { numeric: true, sensitivity: "base" });
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

export function paginateTopics(topics: HskTopic[], requestedPage: number, limit = 12): PageData<HskTopic> {
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
