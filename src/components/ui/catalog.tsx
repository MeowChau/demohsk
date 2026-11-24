import { NavigationForm } from "@/components/shell/navigation-protection";
import { NavigationLink as Link } from "@/components/shell/navigation-protection";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { HSK_LEVELS, SKILL_LABELS } from "@/lib/hsk";
import { catalogHref, type CatalogQuery } from "@/lib/catalog-query";
import type { HskTopic, PageData } from "@/lib/api/types";
import { RefreshButton } from "./refresh-button";

export function PageHeading({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div data-page-heading="" className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <h1 className="hsk-page-title min-w-0">{title}</h1>
      <p className="min-w-0 break-words text-sm leading-6 text-slate sm:col-span-2 sm:row-start-2">{description}</p>
      <div className="flex max-w-full flex-wrap items-center gap-2 sm:col-start-2 sm:row-start-1 sm:justify-end">
        {children}<RefreshButton />
      </div>
    </div>
  );
}
export { HskBadge } from "./catalog-badge";
export function CatalogFilters({ path, query, topics = [], skills = false, topicFilter = true, resetHref = path, onSubmit, searchLabel = "Tìm kiếm", searchPlaceholder = "Tên, chữ Hán hoặc pinyin…" }: { path: string; query: CatalogQuery; topics?: HskTopic[]; skills?: boolean; topicFilter?: boolean; resetHref?: string; onSubmit?: React.FormEventHandler<HTMLFormElement>; searchLabel?: string; searchPlaceholder?: string }) {
  return <NavigationForm action={path} onSubmit={onSubmit} className="hsk-panel flex flex-wrap items-end gap-3">
    {query.view && <input type="hidden" name="view" value={query.view} />}
    <label className="flex min-w-36 flex-1 flex-col gap-2 text-sm font-medium text-ink">{searchLabel}<input name="search" defaultValue={query.search} className="hsk-input" placeholder={searchPlaceholder} maxLength={500} /></label>
    <label className="flex flex-col gap-2 text-sm font-medium text-ink">Cấp độ<select name="hskLevel" defaultValue={query.hskLevel} className="hsk-input"><option value="">Tất cả cấp độ</option>{HSK_LEVELS.map(level => <option value={level} key={level}>HSK {level}</option>)}</select></label>
    {skills && <label className="flex flex-col gap-2 text-sm font-medium text-ink">Kỹ năng<select name="skill" defaultValue={query.skill} className="hsk-input"><option value="">Tất cả kỹ năng</option>{Object.entries(SKILL_LABELS).map(([key, label]) => <option key={key} value={key.toUpperCase()}>{label}</option>)}</select></label>}
    {topicFilter && <label className="flex min-w-44 max-w-full flex-col gap-2 text-sm font-medium text-ink">Chủ đề<select name="topic" defaultValue={query.topic} className="hsk-input max-w-64"><option value="">Tất cả chủ đề</option>{topics.map(topic => <option key={topic.topicKey} value={topic.topicKey}>{topic.titleVi || topic.titleCn}</option>)}</select></label>}
    <button className="hsk-button" type="submit">Áp dụng</button><Link href={resetHref} className="hsk-button-secondary">Đặt lại</Link>
  </NavigationForm>;
}
export function CatalogPagination({ path, query, data }: { path: string; query: Pick<CatalogQuery, "page" | "limit"> & Partial<CatalogQuery>; data: Pick<PageData<unknown>, "page" | "total" | "totalPages"> }) {
  if (data.total <= 0) return null;
  const totalPages = Math.max(1, data.totalPages);
  const visible = totalPages <= 7 ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : [...new Set([1, data.page - 1, data.page, data.page + 1, totalPages].filter(page => page >= 1 && page <= totalPages))].sort((a, b) => a - b);
  const pages: (number | string)[] = [];
  visible.forEach((page, index) => {
    if (index > 0 && page - visible[index - 1]! > 1) pages.push("gap-" + page);
    pages.push(page);
  });
  return <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate">
    <p>{data.total ? `${(data.page - 1) * query.limit + 1}–${Math.min(data.page * query.limit, data.total)} / ${data.total.toLocaleString("vi-VN")} kết quả` : "0 kết quả"} · Trang {data.page} / {totalPages}</p>
    <nav aria-label="Phân trang danh sách" className="flex max-w-full flex-wrap items-center gap-2">
      {data.page > 1 && <Link className="hsk-button-secondary min-h-11" aria-label="Trang trước" href={catalogHref(path, query, { page: data.page - 1 })}><ChevronLeft size={16} aria-hidden="true" />Trước</Link>}
      {pages.map(page => typeof page === "string" ? <span key={page} aria-hidden="true" className="px-1">…</span>
        : page === data.page ? <span key={page} aria-current="page" aria-label={"Trang " + page} className="hsk-button min-h-11 min-w-11 justify-center px-3">{page}</span>
          : <Link key={page} aria-label={"Trang " + page} className="hsk-button-secondary min-h-11 min-w-11 justify-center px-3" href={catalogHref(path, query, { page })}>{page}</Link>)}
      {data.page < data.totalPages && <Link className="hsk-button-secondary min-h-11" aria-label="Trang sau" href={catalogHref(path, query, { page: data.page + 1 })}>Sau<ChevronRight size={16} aria-hidden="true" /></Link>}
    </nav>
  </div>;
}
export function DataEmpty({ title = "Chưa có nội dung phù hợp", description = "Thử đổi bộ lọc hoặc quay lại sau khi nội dung được cập nhật." }: { title?: string; description?: string }) {
  return <div className="hsk-panel flex flex-col items-center gap-3 py-12 text-center"><BookOpen className="text-slate-soft" size={28} /><h2 className="hsk-section-title">{title}</h2><p className="max-w-md text-sm leading-6 text-slate">{description}</p></div>;
}
