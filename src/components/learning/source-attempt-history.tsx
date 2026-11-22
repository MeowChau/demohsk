import Link from "next/link";
import { serverApi } from "@/lib/api/server";
import { ApiError } from "@/lib/api/client";
import type { PageData } from "@/lib/api/types";
import { historyHref, type AttemptHistorySummary } from "@/lib/learning-history";
import { DataEmpty } from "@/components/ui/catalog";
import { AttemptHistoryTable } from "./attempt-history-table";

export async function SourceAttemptHistory({ kind, sourceId }: { kind: "exam" | "set"; sourceId: number }) {
  const href = historyHref({ kind, sourceId: String(sourceId) });
  const history = await serverApi<PageData<AttemptHistorySummary>>(`learning-scores/history?kind=${kind}&sourceId=${sourceId}&page=1&limit=5`).catch(error => {
    if (error instanceof ApiError && (error.status === 404 || error.status >= 500)) return null;
    throw error;
  });
  return <section className="flex min-w-0 flex-col gap-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="hsk-section-title">{kind === "exam" ? "Lịch sử làm đề này" : "Lịch sử bài luyện này"}</h2><Link href={href} className="text-sm font-medium text-brand">Xem tất cả →</Link></div>
    {!history ? <p className="hsk-error" role="alert">Chưa tải được lịch sử bài này. Bấm Làm mới để thử lại.</p> : history.data.length ? <AttemptHistoryTable items={history.data} /> : <DataEmpty title="Bạn chưa nộp bài này" description="Kết quả sẽ xuất hiện tại đây sau khi nộp và lưu thành công." />}
  </section>;
}
