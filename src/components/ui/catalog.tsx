import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { HSK_LEVELS, SKILL_LABELS } from "@/lib/hsk";
import { catalogHref, type CatalogQuery } from "@/lib/catalog-query";
import type { HskTopic, PageData } from "@/lib/api/types";
import { RefreshButton } from "./refresh-button";

export function PageHeading({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="hsk-page-title">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate">{description}</p></div><div className="flex flex-wrap items-center gap-2">{children}<RefreshButton /></div></div>;
}
export { HskBadge } from "./catalog-badge";
export function CatalogFilters({ path, query, topics = [], skills = false, topicFilter = true, resetHref = path, onSubmit, searchLabel = "Tìm kiếm", searchPlaceholder = "Tên, chữ Hán hoặc pinyin…" }: { path: string; query: CatalogQuery; topics?: HskTopic[]; skills?: boolean; topicFilter?: boolean; resetHref?: string; onSubmit?: React.FormEventHandler<HTMLFormElement>; searchLabel?: string; searchPlaceholder?: string }) {
  return <form action={path} onSubmit={onSubmit} className="hsk-panel flex flex-wrap items-end gap-3">
    {query.view && <input type="hidden" name="view" value={query.view} />}
    <label className="flex min-w-36 flex-1 flex-col gap-2 text-sm font-medium text-ink">{searchLabel}<input name="search" defaultValue={query.search} className="hsk-input" placeholder={searchPlaceholder} maxLength={500} /></label>
    <label className="flex flex-col gap-2 text-sm font-medium text-ink">Cấp độ<select name="hskLevel" defaultValue={query.hskLevel} className="hsk-input"><option value="">Tất cả cấp độ</option>{HSK_LEVELS.map(level => <option value={level} key={level}>HSK {level}</option>)}</select></label>
    {skills && <label className="flex flex-col gap-2 text-sm font-medium text-ink">Kỹ năng<select name="skill" defaultValue={query.skill} className="hsk-input"><option value="">Tất cả kỹ năng</option>{Object.entries(SKILL_LABELS).map(([key, label]) => <option key={key} value={key.toUpperCase()}>{label}</option>)}</select></label>}
    {topicFilter && <label className="flex min-w-44 max-w-full flex-col gap-2 text-sm font-medium text-ink">Chủ đề<select name="topic" defaultValue={query.topic} className="hsk-input max-w-64"><option value="">Tất cả chủ đề</option>{topics.map(topic => <option key={topic.topicKey} value={topic.topicKey}>{topic.titleVi || topic.titleCn}</option>)}</select></label>}
    <button className="hsk-button" type="submit">Áp dụng</button><Link href={resetHref} className="hsk-button-secondary">Đặt lại</Link>
  </form>;
}
export function CatalogPagination({ path, query, data }: { path: string; query: CatalogQuery; data: Pick<PageData<unknown>, "page" | "total" | "totalPages"> }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate"><p>{data.total.toLocaleString("vi-VN")} kết quả · Trang {data.page} / {Math.max(1, data.totalPages)}</p><div className="flex gap-2">{data.page > 1 && <Link className="hsk-button-secondary" href={catalogHref(path, query, { page: data.page - 1 })}><ChevronLeft size={16} />Trước</Link>}{data.page < data.totalPages && <Link className="hsk-button-secondary" href={catalogHref(path, query, { page: data.page + 1 })}>Sau<ChevronRight size={16} /></Link>}</div></div>;
}
export function DataEmpty({ title = "Chưa có nội dung phù hợp", description = "Thử đổi bộ lọc hoặc quay lại sau khi nội dung được cập nhật." }: { title?: string; description?: string }) {
  return <div className="hsk-panel flex flex-col items-center gap-3 py-12 text-center"><BookOpen className="text-slate-soft" size={28} /><h2 className="hsk-section-title">{title}</h2><p className="max-w-md text-sm leading-6 text-slate">{description}</p></div>;
}
