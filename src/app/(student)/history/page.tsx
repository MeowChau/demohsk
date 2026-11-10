import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireApiUser, serverApi } from "@/lib/api/server";
import { ApiError } from "@/lib/api/client";
import type { PageData } from "@/lib/api/types";
import type { SearchParams } from "@/lib/catalog-query";
import { HSK_LEVELS, SKILL_LABELS } from "@/lib/hsk";
import { historyHref, historySearch, parseHistoryQuery, type AttemptHistorySummary } from "@/lib/learning-history";
import { DataEmpty, PageHeading } from "@/components/ui/catalog";
import { AttemptHistoryTable } from "@/components/learning/attempt-history-table";

export const metadata = { title: "Lịch sử bài làm" };
export default async function HistoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireApiUser();
  const query = parseHistoryQuery(await searchParams);
  const invalidRange = query.from && query.to && query.from > query.to;
  const history = invalidRange ? null : await serverApi<PageData<AttemptHistorySummary>>("learning-scores/history?" + historySearch(query)).catch(error => {
    if (error instanceof ApiError && (error.status === 404 || error.status >= 500)) return null;
    throw error;
  });
  return <div className="flex flex-col gap-6">
    <PageHeading title="Lịch sử bài làm" description="Xem từng lần làm đề thi, bài luyện và kết quả đã lưu theo tài khoản của bạn." />
    <form action="/history" className="hsk-panel flex flex-wrap items-end gap-3">
      {query.sourceId && <input type="hidden" name="sourceId" value={query.sourceId} />}
      <label className="hsk-label min-w-40 flex-1">Tên bài<input name="search" defaultValue={query.search} className="hsk-input" maxLength={200} placeholder="Tìm đề thi hoặc bài luyện…" /></label>
      <label className="hsk-label">Loại bài<select name="kind" defaultValue={query.kind} className="hsk-input"><option value="">Tất cả</option><option value="exam">Đề thi</option><option value="set">Bài luyện</option></select></label>
      <label className="hsk-label">Cấp độ<select name="hskLevel" defaultValue={query.hskLevel} className="hsk-input"><option value="">Tất cả HSK</option>{HSK_LEVELS.map(level => <option key={level} value={level}>HSK {level}</option>)}</select></label>
      <label className="hsk-label">Kỹ năng<select name="skill" defaultValue={query.skill} className="hsk-input"><option value="">Tất cả kỹ năng</option>{Object.entries(SKILL_LABELS).map(([skill, label]) => <option key={skill} value={skill.toUpperCase()}>{label}</option>)}</select></label>
      <label className="hsk-label">Từ ngày<input type="date" name="from" defaultValue={query.from} className="hsk-input" max={query.to || undefined} /></label>
      <label className="hsk-label">Đến ngày<input type="date" name="to" defaultValue={query.to} className="hsk-input" min={query.from || undefined} /></label>
      <button className="hsk-button" type="submit">Áp dụng</button><Link className="hsk-button-secondary" href="/history">Đặt lại</Link>
    </form>
    {query.sourceId && <p className="text-sm text-slate">Đang xem lịch sử của {query.kind === "exam" ? "đề thi" : "bài luyện"} #{query.sourceId}. <Link className="font-medium text-brand" href="/history">Xem tất cả bài làm</Link></p>}
    {!history ? <p className="hsk-error" role="alert">{invalidRange ? "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc. Hãy sửa bộ lọc để xem lịch sử." : "Chưa tải được lịch sử bài làm. Bấm Làm mới để thử lại; các kết quả đã lưu vẫn được giữ trên tài khoản."}</p>
      : history.data.length ? <AttemptHistoryTable items={history.data} />
        : <DataEmpty title="Chưa có bài làm phù hợp" description="Nộp một đề thi hoặc bài luyện để lưu kết quả, hoặc thử thay đổi bộ lọc." />}
    {history && <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate"><p>{history.total} lượt làm · Trang {history.page}/{Math.max(1, history.totalPages)}</p><div className="flex gap-2">
      {history.page > 1 && <Link className="hsk-button-secondary" href={historyHref({ ...query, page: history.page - 1 })}><ChevronLeft size={16} />Trước</Link>}
      {history.page < history.totalPages && <Link className="hsk-button-secondary" href={historyHref({ ...query, page: history.page + 1 })}>Sau<ChevronRight size={16} /></Link>}
    </div></div>}
  </div>;
}
