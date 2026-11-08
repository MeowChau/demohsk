import Link from "next/link";
import { requireApiUser, serverApi } from "@/lib/api/server";
import type { PageData, PkHistory } from "@/lib/api/types";
import { parseCatalogQuery, type SearchParams } from "@/lib/catalog-query";
import { HSK_LEVELS } from "@/lib/hsk";
import { CatalogPagination, DataEmpty, HskBadge, PageHeading } from "@/components/ui/catalog";
import { PkArena } from "@/components/learning/pk-arena";
export const metadata = { title: "Đấu PK tiếng Trung" };
export default async function PkPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireApiUser();
  const query = parseCatalogQuery(await searchParams, user.currentHskLevel || 1);
  const level = Number(query.hskLevel || 1);
  const history = await serverApi<PageData<PkHistory>>(`game/pk/history?page=${query.page}&limit=10`);
  return <div className="flex flex-col gap-6"><Link href="/games" className="text-sm font-medium text-brand">← Trò chơi tiếng Trung</Link><PageHeading title="Đấu PK từ vựng" description="Luyện cùng học viên khác trong phòng cùng cấp độ. Trận hoàn thành và EXP được lưu bởi hệ thống." /><form action="/games/pk" className="flex items-end gap-3"><label className="hsk-label">Cấp độ phòng<select name="hskLevel" defaultValue={level} className="hsk-input">{HSK_LEVELS.map(value => <option key={value} value={value}>HSK {value}</option>)}</select></label><button className="hsk-button-secondary">Đổi phòng</button></form><PkArena key={level} userId={Number(user.id)} level={level} /><section className="flex flex-col gap-4"><h2 className="hsk-section-title">Lịch sử trận đã hoàn thành</h2>{history.data.length ? <div className="hsk-panel overflow-x-auto p-0"><table className="w-full whitespace-nowrap text-left text-sm"><thead className="border-b border-mist bg-paper text-slate"><tr>{["Đối thủ", "Cấp độ", "Kết quả", "Điểm", "EXP", "Thời gian"].map(label => <th className="px-5 py-4 font-medium" key={label}>{label}</th>)}</tr></thead><tbody>{history.data.map(item => <tr key={item.id} className="border-b border-mist last:border-0"><td className="px-5 py-4 font-medium text-ink">{item.opponentName}</td><td className="px-5 py-4"><HskBadge level={item.hskLevel} /></td><td className="px-5 py-4 text-slate">{item.isDraw ? "Hòa" : item.isWin ? "Thắng" : "Thua"}</td><td className="px-5 py-4 text-slate">{item.score}</td><td className="px-5 py-4 text-brand">+{item.xpEarned}</td><td className="px-5 py-4 text-slate">{item.completedAt ? new Date(item.completedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—"}</td></tr>)}</tbody></table></div> : <DataEmpty title="Chưa có trận PK đã hoàn thành" description="Lịch sử xuất hiện sau khi trận đấu kết thúc và được hệ thống lưu." />}<CatalogPagination path="/games/pk" query={query} data={history} /></section></div>;
}
