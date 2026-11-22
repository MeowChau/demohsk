import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { parseGradingMode } from "@/lib/practice-scoring";
import { notFound } from "next/navigation";
import { resourceId } from "@/lib/attempt-routes";
import { AttemptContent } from "@/components/learning/attempt-page";

export default async function PracticeSetAttemptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ grading?: string | string[] }> }) {
  const id = resourceId((await params).id);
  if (!id) notFound();
  const query = await searchParams;
  return <Suspense key={id} fallback={<div role="status"><LoadingSpinner label="Đang tải bài luyện…" /></div>}>
    <AttemptContent reference={"set-" + id} gradingMode={parseGradingMode(query?.grading)} />
  </Suspense>;
}
