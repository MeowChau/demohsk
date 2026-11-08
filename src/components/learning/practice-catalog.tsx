import Link from "next/link";
import { Headphones, Mic, BookOpen, PenLine, ArrowRight } from "lucide-react";
import { getPracticeSets, getTopics } from "@/lib/api/catalog";
import { practiceHref, practicePath, type CatalogQuery } from "@/lib/catalog-query";
import { CatalogPagination, DataEmpty, HskBadge, PageHeading } from "@/components/ui/catalog";
import { PracticeFilters } from "./practice-filters";
import { SKILL_LABELS } from "@/lib/hsk";
import type { Skill } from "@/types/assessment";

export async function PracticeCatalog({ query }: { query: CatalogQuery }) {
  const [sets, topics] = await Promise.all([getPracticeSets(query), getTopics()]);
  const topicNames = new Map(topics.map(topic => [topic.topicKey, topic.titleVi]));
  const skills = [["LISTENING", "Nghe hiểu", Headphones], ["SPEAKING", "Luyện nói", Mic], ["READING", "Đọc hiểu", BookOpen], ["WRITING", "Luyện viết", PenLine]] as const;
  return <div className="flex flex-col gap-6">
    <PageHeading title="Luyện tập tiếng Trung" description="Chọn cấp độ, kỹ năng và chủ đề để mở các bộ luyện tập được xuất bản trong hệ thống." />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{skills.map(([skill, label, Icon]) => <Link key={skill} href={practiceHref(query, { skill, page: 1 })} aria-current={query.skill === skill ? "page" : undefined} className={`hsk-panel flex items-center gap-3 transition ${query.skill === skill ? "border-brand bg-brand/5" : "hover:border-brand"}`}><Icon size={22} className="text-brand" /><span className="text-sm font-medium text-ink">{label}</span></Link>)}</div>
    <PracticeFilters key={practiceHref(query)} query={query} topics={topics} />
    {sets.data.length ? <div className="grid gap-4 md:grid-cols-2">{sets.data.map(set => <article key={set.id} className="hsk-panel flex flex-col gap-4"><div className="flex items-center justify-between gap-3"><HskBadge level={set.hskLevel} /><span className="text-xs text-slate">{SKILL_LABELS[(set.skill.slice(0, 1) + set.skill.slice(1).toLowerCase()) as Skill] || set.skill}</span></div><h2 className="hsk-section-title">{set.title}</h2><p className="text-sm text-slate">{topicNames.get(set.topic) || set.topic || "Chủ đề tổng hợp"}</p><div className="mt-auto flex items-center justify-between gap-3 border-t border-mist pt-4"><span className="text-xs text-slate-soft">{set.totalQuestions ?? set.practiceSetQuestions?.length ?? 0} câu hỏi</span><Link href={`/practice/attempt/set-${set.id}?testid=set-${set.id}`} className="hsk-button">Mở bài luyện<ArrowRight size={16} /></Link></div></article>)}</div> : <DataEmpty />}
    <CatalogPagination path={practicePath(query.skill)} query={{ ...query, skill: "" }} data={sets} />
  </div>;
}
