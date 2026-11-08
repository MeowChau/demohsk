import Link from "next/link";
import { examDetailHref } from "@/lib/attempt-routes";
import { FileText, ArrowRight } from "lucide-react";
import { getExams } from "@/lib/api/catalog";
import { parseCatalogQuery, type SearchParams } from "@/lib/catalog-query";
import { CatalogFilters, CatalogPagination, DataEmpty, HskBadge, PageHeading } from "@/components/ui/catalog";
export const metadata = { title: "Đề thi HSK" };
export default async function ExamsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = parseCatalogQuery(await searchParams);
  const exams = await getExams({ page: query.page, limit: query.limit, hskLevel: query.hskLevel, search: query.search });
  return <div className="flex flex-col gap-6"><PageHeading title="Đề thi HSK" description="Các đề đã được biên soạn trên hệ thống, gồm phần thi, câu hỏi, hình ảnh và âm thanh." /><CatalogFilters path="/exams" query={query} topicFilter={false} />
    {exams.data.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{exams.data.map(exam => <article className="hsk-panel flex flex-col gap-4" key={exam.id}><div className="flex items-center justify-between"><FileText className="text-brand" size={24} /><HskBadge level={exam.hskLevel} /></div><h2 className="hsk-section-title">{exam.title}</h2><p className="line-clamp-3 text-sm leading-6 text-slate">{exam.description || "Mở đề để xem cấu trúc và bắt đầu tự luyện."}</p><div className="mt-auto flex items-center justify-between gap-3 border-t border-mist pt-4"><span className="text-xs text-slate-soft">{exam.sections?.length || 0} phần · {exam.sections?.reduce((sum, section) => sum + section.sectionQuestions.length, 0) || 0} câu</span><Link className="hsk-button" href={examDetailHref(exam.id)}>Xem đề<ArrowRight size={15} /></Link></div></article>)}</div> : <DataEmpty title="Chưa có đề thi phù hợp" />}
    <CatalogPagination path="/exams" query={query} data={exams} />
  </div>;
}
