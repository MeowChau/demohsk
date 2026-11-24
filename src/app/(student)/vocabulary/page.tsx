import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronRight } from "lucide-react";
import { getLessonWords, getTopics, getWords } from "@/lib/api/catalog";
import { getApiUser } from "@/lib/api/server";
import { catalogHref, parseCatalogQuery, prioritizeCatalog, type SearchParams, type CatalogQuery } from "@/lib/catalog-query";
import { CatalogFilters, CatalogPagination, DataEmpty, HskBadge, PageHeading } from "@/components/ui/catalog";
import { WordCards } from "@/components/learning/word-cards";
import { StudyTracker } from "@/components/shell/study-tracker";
import { STUDY_MODULES } from "@/lib/hsk";
import { filterTopics, getVocabularyLessons, getVocabularyTopics, paginateTopics, sortTopics } from "@/lib/topic-catalog";
import type { HskWord, PageData } from "@/lib/api/types";

export const metadata = { title: "Từ vựng tiếng Trung" };

export default async function VocabularyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query: CatalogQuery = { ...parseCatalogQuery(params), view: params.view === "list" ? "list" : "cards" };
  const [allTopics, user] = await Promise.all([getTopics(query.hskLevel), getApiUser()]);
  const topics = prioritizeCatalog(sortTopics(getVocabularyTopics(allTopics)), user?.currentHskLevel);
  const lessonTopics = prioritizeCatalog(sortTopics(getVocabularyLessons(allTopics)), user?.currentHskLevel);
  const choosingLesson = query.view === "cards" && !query.topic;
  const vocabularyTopics = query.view === "cards" ? lessonTopics : topics;
  const lessons = choosingLesson ? paginateTopics(filterTopics(lessonTopics, query.search), query.page, query.limit) : null;
  const topicNames = Object.fromEntries(topics.map(topic => [topic.topicKey, topic.titleVi]));
  const lesson = topics.find(topic => topic.topicKey === query.topic);
  let words: HskWord[] = [];
  let wordPage: PageData<HskWord> | null = null;
  if (query.view === "list") {
    wordPage = await getWords(query, user?.currentHskLevel ?? 1);
    words = wordPage.data;
  } else if (query.topic) {
    words = await getLessonWords(query, { withAudio: true });
  }
  const activePage = lessons || wordPage;
  const activeQuery = activePage ? { ...query, page: activePage.page, limit: activePage.limit } : query;
  const resetHref = catalogHref("/vocabulary", { view: query.view });
  const tabs = (view: "cards" | "list") => catalogHref("/vocabulary", { ...query, view, page: 1, search: "" });
  return (
    <div className="flex flex-col gap-6">
      <StudyTracker module={STUDY_MODULES.vocabulary} />
      <PageHeading title="Từ vựng tiếng Trung" description="Chọn một chủ đề để học trọn bài bằng flashcard, hoặc xem danh sách và đánh dấu mức độ ghi nhớ từng từ." />
      <CatalogFilters path="/vocabulary" query={activeQuery} topics={vocabularyTopics} resetHref={resetHref} topicFilter={!choosingLesson}
        searchLabel={choosingLesson ? "Tìm bài học" : "Tìm từ vựng"}
        searchPlaceholder={choosingLesson ? "Tên chủ đề, chữ Hán hoặc pinyin…" : "Chữ Hán, pinyin hoặc nghĩa từ…"} />
      <nav className="flex flex-wrap gap-2" aria-label="Cách xem từ vựng">
        <Link className={query.view === "cards" ? "hsk-button" : "hsk-button-secondary"} aria-current={query.view === "cards" ? "page" : undefined} href={tabs("cards")}>Lật thẻ</Link>
        <Link className={query.view === "list" ? "hsk-button" : "hsk-button-secondary"} aria-current={query.view === "list" ? "page" : undefined} href={tabs("list")}>Danh sách</Link>
      </nav>
      {lessons ? <>
        <div><h2 className="hsk-section-title">Bài học từ vựng theo chủ đề</h2><p className="mt-2 text-sm text-slate">Mỗi bài gồm các từ cùng chủ đề. Chọn một bài để bắt đầu lật thẻ.</p></div>
        {lessons.data.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{lessons.data.map(topic => <article key={topic.topicKey} className="hsk-panel flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3"><BookOpen size={24} className="text-brand" aria-hidden="true" /><HskBadge level={topic.hskLevel} /></div>
          <h3 className="hsk-section-title">{topic.titleVi || topic.titleCn || topic.topicKey}</h3>
          {topic.pinyin && <p className="text-sm text-slate-soft">{topic.pinyin}</p>}
          <p className="text-sm text-slate">{topic.vocabularyCount} từ vựng</p>
          <Link className="hsk-button mt-auto justify-center" href={catalogHref("/vocabulary", { view: "cards", topic: topic.topicKey, hskLevel: query.hskLevel })}>Học bằng flashcard<ChevronRight size={16} aria-hidden="true" /></Link>
        </article>)}</div> : <DataEmpty title="Chưa có bài từ vựng phù hợp" />}
        <CatalogPagination path="/vocabulary" query={activeQuery} data={lessons} />
      </> : <>
        {query.view === "cards" && <Link className="hsk-button-secondary w-fit" href={catalogHref("/vocabulary", { view: "cards", hskLevel: query.hskLevel })}><ArrowLeft size={16} aria-hidden="true" />Chọn bài khác</Link>}
        {words.length ? <WordCards key={JSON.stringify({ ...query, view: undefined })} words={words} view={query.view} lessonTitle={lesson?.titleVi || query.topic} lessonTopic={query.topic} topicNames={topicNames} /> : <DataEmpty title="Chưa có từ vựng phù hợp" />}
        {wordPage && <CatalogPagination path="/vocabulary" query={activeQuery} data={wordPage} />}
      </>}
    </div>
  );
}
