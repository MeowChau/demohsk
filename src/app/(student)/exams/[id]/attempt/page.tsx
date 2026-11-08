import { notFound } from "next/navigation";
import { resourceId } from "@/lib/attempt-routes";
import { AttemptContent } from "@/components/learning/attempt-page";

export default async function ExamAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const id = resourceId((await params).id);
  if (!id) notFound();
  return <AttemptContent reference={"exam-" + id} />;
}
