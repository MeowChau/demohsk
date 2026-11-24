import { NavigationLink as Link } from "@/components/shell/navigation-protection";
import { examDetailHref } from "@/lib/attempt-routes";
import { defaultExamMinutes } from "@/lib/exam-timing";
import { FileText, Clock3, LockKeyhole, CheckCircle2 } from "lucide-react";
import { getExams } from "@/lib/api/catalog";
import { getApiUser } from "@/lib/api/server";
import { parseCatalogQuery, type SearchParams } from "@/lib/catalog-query";
import { CatalogFilters, CatalogPagination, DataEmpty, HskBadge, PageHeading } from "@/components/ui/catalog";
import { historyHref } from "@/lib/learning-history";
export const metadata = { title: "Đề thi HSK" };
export default async function ExamsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = parseCatalogQuery(await searchParams);
  const user = await getApiUser();
  const exams = await getExams({ page: query.page, limit: query.limit, hskLevel: query.hskLevel, search: query.search }, user?.currentHskLevel ?? 1);
  const activeQuery = { ...query, page: exams.page };
  return <div className="flex flex-col gap-6"><PageHeading title="Đề thi HSK" description="Mỗi cấp HSK có một đề miễn phí. Các đề còn lại mua một lần để luyện lại khi cần."><Link href={historyHref({ kind: "exam" })} className="hsk-button-secondary">Lịch sử làm đề</Link></PageHeading><CatalogFilters path="/exams" query={query} topicFilter={false} />
    {exams.data.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{exams.data.map(exam => <article className="hsk-panel flex flex-col gap-4" key={exam.id}>
      <div className="flex items-center justify-between gap-3"><FileText className="text-brand dark:text-ink" size={24} /><HskBadge level={exam.hskLevel} /></div>
      <h2 className="hsk-section-title">{exam.title}</h2>
      {exam.access && <p className={"flex items-center gap-2 text-sm font-semibold " + (exam.access.canAttempt ? "text-success" : "text-brand dark:text-ink")}>
        {exam.access.canAttempt ? <CheckCircle2 size={17} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}
        {exam.access.isFree ? "Miễn phí" : exam.access.isPurchased ? "Đã mua" : exam.access.canAttempt ? "Được truy cập" : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(exam.access.price)}
      </p>}
      <p className="line-clamp-3 text-sm leading-6 text-slate">{exam.description || "Mở đề để xem cấu trúc và chọn thời gian làm bài."}</p>
      <p className="flex items-center gap-2 text-sm text-slate"><Clock3 size={16} aria-hidden="true" />{defaultExamMinutes(exam.hskLevel)} phút</p>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-mist pt-4"><span className="text-xs text-slate-soft">{exam.sections?.length || 0} phần · {exam.totalQuestions ?? exam.sections?.reduce((sum, section) => sum + section.sectionQuestions.length, 0) ?? 0} câu</span><Link className="hsk-button" href={examDetailHref(exam.id)}>{exam.access?.canAttempt === false ? <><LockKeyhole size={16} aria-hidden="true" />Mua đề</> : "Xem đề"}</Link></div>
    </article>)}</div> : <DataEmpty title="Chưa có đề thi phù hợp" />}
    <CatalogPagination path="/exams" query={activeQuery} data={exams} />
  </div>;
}
