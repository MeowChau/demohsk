import { serverApi, requireApiUser } from "@/lib/api/server";
import { publicMedia } from "@/lib/api/config";
import type { LeaderboardData } from "@/lib/api/types";
import { CatalogPagination, PageHeading, HskBadge, DataEmpty } from "@/components/ui/catalog";
import { parseCatalogQuery, type SearchParams } from "@/lib/catalog-query";
import { HSK_LEVELS } from "@/lib/hsk";
export const metadata = { title: "Bảng xếp hạng" };
export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireApiUser();
  const params = await searchParams;
  const query = parseCatalogQuery(params);
  const metric = params.metric === "exp" ? "exp" : "streak";
  const timeframe = metric === "exp" ? "all" : ["week", "month"].includes(String(params.timeframe)) ? String(params.timeframe) : "all";
  const filter = new URLSearchParams({ metric, timeframe, limit: "100" });
  if (query.hskLevel) filter.set("hskLevel", query.hskLevel);
  const result = await serverApi<LeaderboardData>("leaderboard/streak?" + filter);
  const limit = 10;
  const total = result.leaderboard.length;
  const totalPages = Math.ceil(total / limit);
  const page = Math.min(query.page, Math.max(1,totalPages));
  const rows = result.leaderboard.slice((page-1)*limit,page*limit);
  const longestStreakLabel = timeframe === "all" ? "Chuỗi dài nhất" : "Chuỗi dài nhất trong kỳ";
  const currentStreakLabel = timeframe === "all" ? "Chuỗi hiện tại" : "Chuỗi hiện tại trong kỳ";
  const streakPeriod = timeframe === "all" ? "từng đạt được" : timeframe === "week" ? "trong 7 ngày gần nhất" : "trong tháng này";
  return <div className="flex flex-col gap-6"><PageHeading title="Bảng xếp hạng học tập" description="Theo dõi chuỗi ngày học và EXP. Thứ hạng dựa trên hoạt động được hệ thống ghi nhận." />
    <form className="hsk-panel flex flex-wrap items-end gap-3" action="/leaderboard"><label className="hsk-label">Tiêu chí<select className="hsk-input" defaultValue={metric} name="metric"><option value="streak">Chuỗi ngày học dài nhất</option><option value="exp">Tổng EXP</option></select></label><label className="hsk-label">Thời gian<select name="timeframe" defaultValue={timeframe} className="hsk-input"><option value="all">Toàn thời gian</option><option value="week">7 ngày gần nhất</option><option value="month">Tháng này</option></select></label><label className="hsk-label">Cấp độ<select className="hsk-input" defaultValue={query.hskLevel} name="hskLevel"><option value="">Tất cả cấp độ</option>{HSK_LEVELS.map(level => <option key={level} value={level}>HSK {level}</option>)}</select></label><button className="hsk-button">Áp dụng</button></form>
    
    {metric === "exp" && <p className="hsk-notice">EXP được tính toàn thời gian. Hạng của bạn: <strong>{result.myRank ?? "Chưa xếp hạng trong bộ lọc"}</strong> · Tổng EXP: <strong>{result.myTotalExp?.toLocaleString("vi-VN") ?? "—"}</strong></p>}
    {result.leaderboard.length ? <div className="hsk-panel overflow-x-auto p-0"><table className="w-full whitespace-nowrap text-left text-sm"><caption className="sr-only">Xếp hạng học viên theo {metric === "exp" ? "tổng EXP" : "chuỗi ngày học dài nhất " + streakPeriod}</caption><thead className="border-b border-mist bg-paper text-xs font-medium text-slate"><tr>{["Hạng", "Học viên", "HSK", metric === "exp" ? "Tổng EXP" : longestStreakLabel, metric === "exp" ? longestStreakLabel : currentStreakLabel, "Thời gian học"].map((label, index) => <th key={label} aria-sort={index === 3 ? "descending" : undefined} className="px-5 py-4 font-medium">{label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id} className={`border-b border-mist last:border-0 ${String(row.id) === String(user.id) ? "bg-brand/5" : ""}`}><td className="px-5 py-4 font-semibold text-ink">{row.rank || (page-1)*limit + index + 1}</td><td className="px-5 py-4"><div className="flex items-center gap-3">{row.photo?.path ? <img alt="" className="h-9 w-9 rounded-full object-cover" src={publicMedia(row.photo.path) || undefined} /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 font-medium text-brand">{row.fullName.slice(0, 1)}</span>}<span className="font-medium text-ink">{row.fullName}{String(row.id) === String(user.id) ? " (Bạn)" : ""}</span></div></td><td className="px-5 py-4">{row.currentHskLevel || row.targetHskLevel ? <HskBadge level={row.currentHskLevel || row.targetHskLevel!} /> : "—"}</td><td className="px-5 py-4 text-ink">{metric === "exp" ? row.totalExp?.toLocaleString("vi-VN") ?? "—" : row.longestStreak + " ngày"}</td><td className="px-5 py-4 text-slate">{metric === "exp" ? row.longestStreak : row.currentStreak} ngày</td><td className="px-5 py-4 text-slate">{row.totalHours.toLocaleString("vi-VN")} giờ</td></tr>)}</tbody></table></div> : <DataEmpty title="Chưa có học viên phù hợp" />}
    {total > 0 && <CatalogPagination path="/leaderboard" query={{page,limit,...{metric,timeframe},hskLevel:query.hskLevel}} data={{page,total,totalPages}} />}
    {total === 100 && <p className="text-xs text-slate">Đang hiển thị tối đa 100 học viên dẫn đầu theo giới hạn của bảng xếp hạng.</p>}
  </div>;
}
