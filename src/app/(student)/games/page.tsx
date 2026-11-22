import Link from "next/link";
import { ArrowUpRight, Trophy } from "lucide-react";
import { requireApiUser, serverApi } from "@/lib/api/server";
import { publicMedia } from "@/lib/api/config";
import { validHskLevel } from "@/lib/hsk";
import { userDisplayName } from "@/lib/user-display";
import { ApiError } from "@/lib/api/client";
import type { PageData, PkHistory } from "@/lib/api/types";
import { parseCatalogQuery, type SearchParams } from "@/lib/catalog-query";
import { CatalogPagination, DataEmpty, HskBadge, PageHeading } from "@/components/ui/catalog";
import { PkLobby } from "@/components/learning/pk-lobby";

export const metadata = { title: "Game PK (1 vs 1)" };

export default async function GamesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireApiUser();
  const level = validHskLevel(user.currentHskLevel);
  const query = { ...parseCatalogQuery(await searchParams), hskLevel: level === null ? "" : String(level) };
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

      <PkLobby currentLevel={level}
        displayName={userDisplayName(user)} avatarUrl={publicMedia(user.photo?.path)} totalMatches={history?.total ?? null} />

      <section id="pk-history" className="flex min-w-0 scroll-mt-28 flex-col gap-4" aria-labelledby="pk-history-title">
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
          ) : <DataEmpty title="Chưa có trận PK nào" description="Bấm Ghép trận để thi đấu. Kết quả và EXP của trận hoàn thành sẽ xuất hiện tại đây." />}
        {history && <CatalogPagination path="/games" query={{ ...query, limit: 10, skill: "", topic: "", search: "" }} data={history} />}
      </section>
    </div>
  );
}
