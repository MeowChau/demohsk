import Link from "next/link";
import { examAttemptHref, examDetailHref, resourceId } from "@/lib/attempt-routes";
import { notFound, permanentRedirect } from "next/navigation";
import { serverApi } from "@/lib/api/server";
import { publicMedia } from "@/lib/api/config";
import { ApiError } from "@/lib/api/client";
import type { HskExam } from "@/lib/api/types";
import { HskBadge, PageHeading } from "@/components/ui/catalog";
import { SourceAttemptHistory } from "@/components/learning/source-attempt-history";
export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const normalizedId = resourceId(id);
  if (!normalizedId) notFound();
  if (id !== normalizedId) permanentRedirect(examDetailHref(normalizedId));
  let exam: HskExam;
  try { exam = await serverApi<HskExam>(`exams/${id}`); } catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
  return <div className="flex flex-col gap-6"><Link className="text-sm font-medium text-brand" href="/exams">← Danh sách đề thi</Link><PageHeading title={exam.title} description="Xem cấu trúc và nội dung đề trước khi tự luyện." /><div className="hsk-panel flex flex-col gap-4"><HskBadge level={exam.hskLevel} /><p className="whitespace-pre-line text-sm leading-7 text-slate">{exam.description || "Đề thi gồm các phần dưới đây."}</p><Link className="hsk-button w-fit" href={examAttemptHref(id)}>Bắt đầu tự luyện</Link></div><p className="hsk-notice">Nộp bài và lưu thành công để xem lại trong Lịch sử bài làm. Kết quả là điểm luyện tập nội bộ, không phải chứng chỉ thi HSK chính thức.</p><div className="grid gap-4 md:grid-cols-2">{[...(exam.sections || [])].sort((a, b) => a.order - b.order).map(section => <section className="hsk-panel" key={section.id}><h2 className="hsk-section-title">{section.order}. {section.title}</h2><p className="mt-2 text-sm text-slate">{section.sectionQuestions.length} câu hỏi</p>{section.audioUrl && <audio className="mt-4 w-full" controls preload="none" src={publicMedia(section.audioUrl) || undefined} aria-label={`Âm thanh ${section.title}`} />}</section>)}</div><SourceAttemptHistory kind="exam" sourceId={Number(id)} /></div>;
}
