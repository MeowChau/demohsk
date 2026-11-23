import Link from "next/link";
import { Headphones, BookOpen, Mic, PenLine, ArrowRight, Languages } from "lucide-react";
import { getTopics } from "@/lib/api/catalog";
import { getApiUser } from "@/lib/api/server";
import { parseCatalogQuery, prioritizeCatalog, catalogHref, type SearchParams } from "@/lib/catalog-query";
import { CatalogFilters, CatalogPagination, DataEmpty, HskBadge, PageHeading } from "@/components/ui/catalog";
import { filterTopics, getTextbookTopics, getVocabularyTopics, paginateTopics, sortTopics, vocabularyForLesson } from "@/lib/topic-catalog";
export const metadata = { title: "Chủ đề bài học" };
export default async function LearningPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = parseCatalogQuery(await searchParams);
  const [topics, user] = await Promise.all([getTopics(query.hskLevel), getApiUser()]);
  const page = paginateTopics(filterTopics(prioritizeCatalog(sortTopics(getTextbookTopics(topics)), user?.currentHskLevel), query.search), query.page, query.limit);
  const vocabularyTopics = getVocabularyTopics(topics);
  const activeQuery = { ...query, page: page.page };
  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Chủ đề bài học" description="Học theo bài khóa trong giáo trình HSK. Chọn bài để mở từ vựng và các phần luyện tập tương ứng." />
      <CatalogFilters path="/learning" query={activeQuery} topicFilter={false} />
      <p className="text-sm text-slate">{page.total} chủ đề · {page.limit} chủ đề mỗi trang</p>
      {page.data.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{page.data.map(topic => {
        const vocabulary = vocabularyForLesson(topic, vocabularyTopics);
        return <article key={topic.topicKey} className="hsk-panel flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand dark:bg-brand/25 dark:text-ink"><BookOpen size={20} /></span><HskBadge level={topic.hskLevel} /></div>
        <div><h2 className="hsk-section-title">{topic.titleVi}</h2>{topic.titleCn && topic.titleCn.normalize("NFKC").trim() !== topic.titleVi.normalize("NFKC").trim() && <p className="mt-2 text-lg leading-8 text-ink" lang="zh-CN">{topic.titleCn}</p>}{topic.pinyin && <p className="mt-1 text-sm text-slate-soft">{topic.pinyin}</p>}</div>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate">{[[Headphones, "Nghe", topic.listeningCount, "dark:text-teal"], [Mic, "Nói", topic.speakingCount, "dark:text-violet"], [BookOpen, "Đọc", topic.readingCount, "dark:text-brand"], [PenLine, "Viết", topic.writingCount, "dark:text-xp"]].map(([Icon, label, count, iconColor]) => {
          const SkillIcon = Icon as typeof Headphones;
          return <span key={String(label)} className="flex items-center gap-2"><SkillIcon size={14} className={String(iconColor)} />{String(label)}: {Number(count || 0)}</span>;
        })}</div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-mist pt-4">{vocabulary ? <Link className="hsk-button-secondary" href={catalogHref("/vocabulary", { topic: vocabulary.topicKey, hskLevel: String(topic.hskLevel), view: "cards" })}><Languages size={15} />Học {vocabulary.vocabularyCount} từ</Link> : <span className="self-center text-xs text-slate-soft">Chưa có từ vựng</span>}<Link className="hsk-button ml-auto" href={catalogHref("/practice", { topic: topic.topicKey, hskLevel: String(topic.hskLevel) })}>{topic.totalSets} bài luyện<ArrowRight size={15} /></Link></div>
      </article>; })}</div> : <DataEmpty />}
      <CatalogPagination path="/learning" query={activeQuery} data={page} />
    </div>
  );
}
