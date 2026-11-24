import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { parseGradingMode } from "@/lib/practice-scoring";
import { parseExamMinutes } from "@/lib/exam-timing";
import { notFound, redirect } from "next/navigation";
import { resourceId } from "@/lib/attempt-routes";
import { AttemptContent } from "@/components/learning/attempt-page";

export default async function ExamAttemptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ duration?: string | string[]; grading?: string | string[] }> }) {
  const id = resourceId((await params).id);
  if (!id) notFound();
  const { duration, grading } = await searchParams;
  const minutes = typeof duration === "string" ? parseExamMinutes(duration) : null;
  if (duration !== undefined && minutes === null) redirect("/exams/" + id + "/attempt");
  return <Suspense key={id} fallback={<LoadingSpinner label="Đang tải bài thi…" />}>
    <AttemptContent reference={"exam-" + id} durationMinutes={minutes ?? undefined} gradingMode={parseGradingMode(grading)} />
  </Suspense>;
}
