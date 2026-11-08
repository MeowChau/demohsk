import Link from "next/link";
import { Headphones, BookOpen, Mic, PenLine, ArrowRight, Languages } from "lucide-react";
import { getTopics } from "@/lib/api/catalog";
import { parseCatalogQuery, catalogHref, type SearchParams } from "@/lib/catalog-query";
import { CatalogFilters, DataEmpty, HskBadge, PageHeading } from "@/components/ui/catalog";
export const metadata = { title: "Chủ đề bài học" };
export default async function LearningPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = parseCatalogQuery(await searchParams);
  const topics = await getTopics(query.hskLevel);
  const term = query.search.toLocaleLowerCase();
  const visible = topics.filter(topic => [topic.titleVi, topic.titleCn, topic.pinyin, topic.topicKey].some(text => (text || "").toLocaleLowerCase().includes(term)));
  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Chủ đề bài học" description="Khám phá bài học tiếng Trung theo cấp độ. Mỗi chủ đề liên kết tới đúng từ vựng và bộ luyện tập đang có." />
      <CatalogFilters path="/learning" query={query} topicFilter={false} />
      <p className="text-sm text-slate">{visible.length} chủ đề</p>
      {visible.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visible.map(topic => <article key={topic.topicKey} className="hsk-panel flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand"><BookOpen size={20} /></span><HskBadge level={topic.hskLevel} /></div>
        <div><h2 className="hsk-section-title">{topic.titleVi}</h2><p className="mt-2 text-lg leading-8 text-ink" lang="zh-CN">{topic.titleCn}</p><p className="mt-1 text-sm text-slate-soft">{topic.pinyin}</p></div>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate">{[[Headphones, "Nghe", topic.listeningCount], [Mic, "Nói", topic.speakingCount], [BookOpen, "Đọc", topic.readingCount], [PenLine, "Viết", topic.writingCount]].map(([Icon, label, count]) => {
          const SkillIcon = Icon as typeof Headphones;
          return <span key={String(label)} className="flex items-center gap-2"><SkillIcon size={14} />{String(label)}: {Number(count || 0)}</span>;
        })}</div>
        <div className="mt-auto flex flex-wrap gap-2 border-t border-mist pt-4"><Link className="hsk-button-secondary" href={catalogHref("/vocabulary", { topic: topic.topicKey, hskLevel: String(topic.hskLevel) })}><Languages size={15} />{topic.vocabularyCount} từ</Link><Link className="hsk-button" href={catalogHref("/practice", { topic: topic.topicKey, hskLevel: String(topic.hskLevel) })}>{topic.totalSets} bài luyện<ArrowRight size={15} /></Link></div>
      </article>)}</div> : <DataEmpty />}
    </div>
  );
}
