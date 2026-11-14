import Link from "next/link";
import { getLessonWords, getTopics, getWords } from "@/lib/api/catalog";
import { catalogHref, parseCatalogQuery, type SearchParams } from "@/lib/catalog-query";
import { CatalogFilters, CatalogPagination, DataEmpty, PageHeading } from "@/components/ui/catalog";
import { HandwritingLesson } from "@/components/learning/handwriting-lesson";

export const metadata = { title: "Luyện viết từ vựng" };

export default async function WordWritingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = { ...parseCatalogQuery(params), skill: "" };
  const [wordPage, lessonWords, topics] = await Promise.all([
    query.topic ? null : getWords(query),
    query.topic ? getLessonWords({ ...query, page: 1 }) : null,
    getTopics(query.hskLevel),
  ]);
  const words = lessonWords || wordPage?.data || [];
  const lesson = topics.find(topic => topic.topicKey === query.topic);
  const lessonTitle = lesson?.titleVi || lesson?.titleCn || query.topic;
  const wordId = typeof params.word === "string" ? params.word : undefined;
  return <div className="flex flex-col gap-6">
    <PageHeading title={query.topic ? `Luyện viết · ${lessonTitle}` : "Luyện viết từ vựng"}
      description={query.topic ? `${words.length} từ cùng chủ đề. Luyện lần lượt từng từ; dùng “Từ trước” và “Từ tiếp theo” để chuyển từ.` : "Luyện viết lần lượt từng từ theo cấp độ HSK, từng nét trực tiếp trên ô chữ."} />
    <Link className="w-fit text-sm font-medium text-brand hover:underline" href={query.topic ? catalogHref("/vocabulary", { view: "cards", topic: query.topic, hskLevel: query.hskLevel }) : "/practice/writing"}>
      {query.topic ? "← Quay lại flashcard của bài" : "Xem danh sách bài luyện viết"}
    </Link>
    {!query.topic && <CatalogFilters path="/practice/writing/words" query={query} topics={topics} />}
    {words.length ? <HandwritingLesson key={JSON.stringify(query) + wordId} words={words} initialWordId={wordId} /> : <DataEmpty title="Chưa có từ phù hợp để luyện viết" />}
    {wordPage && <CatalogPagination path="/practice/writing/words" query={query} data={wordPage} />}
  </div>;
}
