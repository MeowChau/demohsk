import Link from "next/link";
import { Headphones, BookOpen, Mic, PenLine, ArrowRight, Languages } from "lucide-react";
import { getTopics } from "@/lib/api/catalog";
import { getApiUser } from "@/lib/api/server";
import { parseCatalogQuery, prioritizeCatalog, catalogHref, type SearchParams } from "@/lib/catalog-query";
import { CatalogFilters, CatalogPagination, DataEmpty, HskBadge, PageHeading } from "@/components/ui/catalog";
import { filterTopics, paginateTopics, sortTopics } from "@/lib/topic-catalog";
export const metadata = { title: "Chủ đề bài học" };
export default async function LearningPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = parseCatalogQuery(await searchParams);
  const [topics, user] = await Promise.all([getTopics(query.hskLevel), getApiUser()]);
  const page = paginateTopics(filterTopics(prioritizeCatalog(sortTopics(topics), user?.currentHskLevel), query.search), query.page, query.limit);
  const activeQuery = { ...query, page: page.page };
  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Chủ đề bài học" description="Khám phá bài học tiếng Trung theo cấp độ. Mỗi chủ đề liên kết tới đúng từ vựng và bộ luyện tập đang có." />
      <CatalogFilters path="/learning" query={activeQuery} topicFilter={false} />
      <p className="text-sm text-slate">{page.total} chủ đề · {page.limit} chủ đề mỗi trang</p>
      {page.data.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{page.data.map(topic => <article key={topic.topicKey} className="hsk-panel flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand"><BookOpen size={20} /></span><HskBadge level={topic.hskLevel} /></div>
        <div><h2 className="hsk-section-title">{topic.titleVi}</h2>{topic.titleCn && topic.titleCn.normalize("NFKC").trim() !== topic.titleVi.normalize("NFKC").trim() && <p className="mt-2 text-lg leading-8 text-ink" lang="zh-CN">{topic.titleCn}</p>}{topic.pinyin && <p className="mt-1 text-sm text-slate-soft">{topic.pinyin}</p>}</div>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate">{[[Headphones, "Nghe", topic.listeningCount], [Mic, "Nói", topic.speakingCount], [BookOpen, "Đọc", topic.readingCount], [PenLine, "Viết", topic.writingCount]].map(([Icon, label, count]) => {
          const SkillIcon = Icon as typeof Headphones;
          return <span key={String(label)} className="flex items-center gap-2"><SkillIcon size={14} />{String(label)}: {Number(count || 0)}</span>;
        })}</div>
        <div className="mt-auto flex flex-wrap gap-2 border-t border-mist pt-4">{topic.vocabularyCount > 0 ? <Link className="hsk-button-secondary" href={catalogHref("/vocabulary", { topic: topic.topicKey, hskLevel: String(topic.hskLevel), view: "cards" })}><Languages size={15} />Học {topic.vocabularyCount} từ</Link> : <span className="self-center text-xs text-slate-soft">Chưa có từ vựng</span>}<Link className="hsk-button" href={catalogHref("/practice", { topic: topic.topicKey, hskLevel: String(topic.hskLevel) })}>{topic.totalSets} bài luyện<ArrowRight size={15} /></Link></div>
      </article>)}</div> : <DataEmpty />}
      <CatalogPagination path="/learning" query={activeQuery} data={page} />
    </div>
  );
}
