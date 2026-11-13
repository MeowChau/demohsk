import Link from "next/link";
import { ArrowUpRight, Clock3, Swords, Trophy, Users } from "lucide-react";
import { requireApiUser, serverApi } from "@/lib/api/server";
import { backendUrl } from "@/lib/api/config";
import { ApiError } from "@/lib/api/client";
import type { PageData, PkHistory } from "@/lib/api/types";
import { parseCatalogQuery, type SearchParams } from "@/lib/catalog-query";
import { CatalogPagination, DataEmpty, HskBadge, PageHeading } from "@/components/ui/catalog";
import { PkArena } from "@/components/learning/pk-arena";

export const metadata = { title: "Game PK (1 vs 1)" };

export default async function GamesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireApiUser();
  const query = parseCatalogQuery(await searchParams, user.currentHskLevel || 1);
  const api = new URL(backendUrl());
  const backendOrigin=api.origin+api.pathname;
  const level = Number(query.hskLevel || 1);
  const history = await serverApi<PageData<PkHistory>>(
    "game/pk/history?page=" + query.page + "&limit=10",
  ).catch(error => {
    if (error instanceof ApiError && (error.status === 404 || error.status >= 500)) return null;
    throw error;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Game PK (1 vs 1)" description="Tìm đối thủ cùng trình độ HSK, thi đấu theo lượt và nhận EXP sau mỗi trận.">
        <Link className="hsk-button-secondary" href="/leaderboard?metric=exp"><Trophy size={17} />Bảng xếp hạng</Link>
      </PageHeading>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <PkArena key={backendOrigin+":"+user.id+":"+level} userId={Number(user.id)} level={level} backendOrigin={backendOrigin} />
        <aside className="hsk-panel flex flex-col gap-5" aria-labelledby="pk-rules-title">
          <h2 id="pk-rules-title" className="hsk-section-title">Thông tin luật chơi</h2>
          <div className="flex items-start gap-3"><Users className="mt-1 shrink-0 text-brand" size={20} /><div><h3 className="text-sm font-semibold text-ink">Đấu trực tiếp 1 vs 1</h3><p className="mt-1 text-sm leading-6 text-slate">Ghép với người chơi cùng cấp HSK trên web. Cả hai xác nhận sẵn sàng để bắt đầu.</p></div></div>
          <div className="flex items-start gap-3"><Clock3 className="mt-1 shrink-0 text-brand" size={20} /><div><h3 className="text-sm font-semibold text-ink">Luân phiên theo lượt</h3><p className="mt-1 text-sm leading-6 text-slate">Trả lời trong thời gian hiển thị. Hết lượt, người chơi tiếp theo sẽ trả lời.</p></div></div>
          <div className="flex items-start gap-3"><Swords className="mt-1 shrink-0 text-brand" size={20} /><div><h3 className="text-sm font-semibold text-ink">Nhanh và chính xác</h3><p className="mt-1 text-sm leading-6 text-slate">Trả lời đúng, nhanh và giữ chuỗi đúng để tăng điểm. Kết quả và EXP được xác nhận khi trận kết thúc.</p></div></div>
        </aside>
      </div>

      <section className="flex min-w-0 flex-col gap-4" aria-labelledby="pk-history-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="pk-history-title" className="hsk-section-title">Lịch sử thi đấu</h2>
          <Link href="/leaderboard?metric=exp" className="inline-flex items-center gap-1 text-sm font-medium text-brand">Xem bảng xếp hạng<ArrowUpRight size={16} /></Link>
        </div>
        {!history ? <p className="hsk-error" role="alert">Chưa tải được lịch sử thi đấu. Bạn vẫn có thể tìm đối thủ; bấm Làm mới để thử tải lại.</p>
          : history.data.length ? (
            <div className="hsk-panel overflow-x-auto p-0">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <caption className="sr-only">Các trận PK đã hoàn thành của bạn</caption>
                <thead className="border-b border-mist bg-paper text-slate"><tr>{["Trận", "Đối thủ", "HSK", "Số câu đúng", "Điểm", "EXP", "Thời gian"].map(label => <th className="px-5 py-4 font-medium" scope="col" key={label}>{label}</th>)}</tr></thead>
                <tbody>{history.data.map(item => (
                  <tr key={item.id} className="border-b border-mist last:border-0">
                    <td className="px-5 py-4"><p className="font-medium text-ink">Trận {item.matchIndex}</p><p className={"mt-1 text-xs font-medium " + (item.isDraw ? "text-slate" : item.isWin ? "text-success" : "text-danger")}>{item.isDraw ? "Hòa" : item.isWin ? "Thắng" : "Thua"}</p></td>
                    <td className="px-5 py-4 font-medium text-ink">{item.opponentName}</td>
                    <td className="px-5 py-4"><HskBadge level={item.hskLevel} /></td>
                    <td className="px-5 py-4 text-slate">{item.correctCount}/{item.totalQuestions}</td>
                    <td className="px-5 py-4 font-semibold text-brand">{item.score}</td>
                    <td className="px-5 py-4 text-brand">+{item.xpEarned}</td>
                    <td className="px-5 py-4 text-slate">{item.completedAt ? new Date(item.completedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <DataEmpty title="Chưa có trận PK nào" description="Bắt đầu tìm người để thi đấu. Kết quả và EXP của trận hoàn thành sẽ xuất hiện tại đây." />}
        {history && <CatalogPagination path="/games" query={{ ...query, limit: 10, skill: "", topic: "", search: "" }} data={history} />}
      </section>
    </div>
  );
}
