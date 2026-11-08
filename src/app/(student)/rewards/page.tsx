import Link from "next/link";
import { Trophy, Sparkles, Flame, Medal } from "lucide-react";
import { requireApiUser, serverApi } from "@/lib/api/server";
import { levelInfo, totalXp } from "@/lib/api/learning";
import type { HskAnalytics, LeaderboardData, PageData, PkHistory } from "@/lib/api/types";
import { PageHeading, DataEmpty } from "@/components/ui/catalog";
export const metadata = { title: "Thành tích học tập" };
export default async function RewardsPage() {
  const user = await requireApiUser();
  const [analytics, ranking, history] = await Promise.all([
    serverApi<HskAnalytics>("analytics/dashboard"),
    serverApi<LeaderboardData>("leaderboard/streak?metric=exp&timeframe=all&limit=1"),
    serverApi<PageData<PkHistory>>("game/pk/history?limit=5&page=1"),
  ]);
  const level = levelInfo(user);
  const stats = [
    { label: "Tổng EXP", value: (ranking.myTotalExp ?? totalXp(user)).toLocaleString("vi-VN"), Icon: Sparkles },
    { label: "Cấp độ EXP", value: level.level, Icon: Medal },
    { label: "Hạng EXP", value: ranking.myRank ?? "Chưa xếp hạng", Icon: Trophy },
    { label: "Chuỗi ngày dài nhất", value: `${analytics.longestStreak} ngày`, Icon: Flame },
  ];
  return <div className="flex flex-col gap-6"><PageHeading title="Thành tích học tập" description="EXP, cấp độ và thành tích được ghi nhận từ tài khoản và các trận PK hoàn thành."><Link className="hsk-button-secondary" href="/leaderboard?metric=exp">Bảng xếp hạng</Link></PageHeading><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{stats.map(({ label, value, Icon }) => <div className="hsk-panel" key={label}><Icon className="mb-3 text-brand" size={22} /><p className="text-sm text-slate">{label}</p><p className="mt-2 text-2xl font-semibold text-ink">{value}</p></div>)}</div><div className="hsk-panel"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="hsk-section-title">Tiến tới cấp {level.level + 1}</h2><p className="text-sm text-slate">{level.currentXp.toLocaleString("vi-VN")} / {level.xpForNextLevel.toLocaleString("vi-VN")} EXP</p></div><div role="progressbar" aria-label="Tiến độ EXP của cấp hiện tại" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level.progressPercent} className="mt-5 h-3 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full bg-brand" style={{ width: `${level.progressPercent}%` }} /></div><p className="mt-4 text-sm leading-6 text-slate">Cấp độ EXP dùng cho hoạt động và trò chơi. Mục tiêu HSK được quản lý riêng trong hồ sơ học viên.</p></div><section className="flex flex-col gap-4"><div className="flex items-center justify-between gap-3"><h2 className="hsk-section-title">EXP từ các trận PK gần đây</h2><Link href="/games" className="text-sm font-medium text-brand">Xem tất cả →</Link></div>{history.data.length ? <div className="grid gap-3">{history.data.map(item => <article key={item.id} className="hsk-panel flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-medium text-ink">{item.isDraw ? "Hòa" : item.isWin ? "Thắng" : "Hoàn thành trận"} · {item.opponentName}</h3><p className="mt-1 text-xs text-slate-soft">HSK {item.hskLevel} · {item.completedAt ? new Date(item.completedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—"}</p></div><span className="text-base font-semibold text-brand">+{item.xpEarned} EXP</span></article>)}</div> : <DataEmpty title="Chưa có trận PK đã hoàn thành" description="Hoàn thành trận PK để hệ thống ghi nhận kết quả và EXP." />}</section></div>;
}
