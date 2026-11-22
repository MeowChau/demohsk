import { notFound } from "next/navigation";
import { requireApiUser, serverApi } from "@/lib/api/server";
import { ApiError } from "@/lib/api/client";
import type { AttemptHistoryDetail } from "@/lib/learning-history";
import { AttemptHistoryReview } from "@/components/learning/attempt-history-review";
import { PageHeading } from "@/components/ui/catalog";

export const metadata = { title: "Chi tiết bài làm" };
export default async function ResultsPage({ params, searchParams }: { params: Promise<{ attemptId: string }>; searchParams: Promise<{ filter?: string }> }) {
  await requireApiUser();
  const { attemptId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attemptId)) notFound();
  const detail = await serverApi<AttemptHistoryDetail>("learning-scores/history/" + attemptId).catch(error => {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof ApiError && error.status >= 500) return null;
    throw error;
  });
  if (!detail) return <div className="flex flex-col gap-5"><PageHeading title="Chi tiết bài làm" description="Xem lại kết quả đã nộp của bạn." /><p className="hsk-error" role="alert">Chưa tải được bài làm. Bấm Làm mới để thử lại.</p></div>;
  return <AttemptHistoryReview detail={detail} filter={(await searchParams).filter || "all"} />;
}
