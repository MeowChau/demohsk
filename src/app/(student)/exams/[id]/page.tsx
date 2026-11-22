import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { examDetailHref, resourceId } from "@/lib/attempt-routes";
import { notFound, permanentRedirect } from "next/navigation";
import { serverApi } from "@/lib/api/server";
import { ApiError } from "@/lib/api/client";
import type { HskExam } from "@/lib/api/types";
import { HskBadge, PageHeading } from "@/components/ui/catalog";
import { SourceAttemptHistory } from "@/components/learning/source-attempt-history";
import { StartExamButton } from "@/components/learning/start-attempt-button";
import { defaultExamMinutes } from "@/lib/exam-timing";
import { ExamPurchase } from "@/components/learning/exam-purchase";
const loadExam = cache((id:string) => serverApi<HskExam>(`exams/${id}`));
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata> {
  const id=resourceId((await params).id);
  if(!id) return {title:"Không tìm thấy đề thi",robots:{index:false,follow:false}};
  try {const exam=await loadExam(id);return {title:exam.title,description:`Đề thi HSK ${exam.hskLevel}: cấu trúc bài thi, thời gian và lịch sử bài làm.`,robots:{index:false,follow:false}};}
  catch {return {title:"Đề thi HSK",robots:{index:false,follow:false}};}
}
export default async function ExamPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ payment?: string | string[] }> }) {
  const { id } = await params;
  const normalizedId = resourceId(id);
  if (!normalizedId) notFound();
  if (id !== normalizedId) permanentRedirect(examDetailHref(normalizedId));
  let exam: HskExam;
  try { exam = await loadExam(id); } catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
  const payment = (await searchParams).payment;
  const paymentId = typeof payment === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payment) ? payment : undefined;
  const sections = [...(exam.sections || [])].sort((a, b) => a.order - b.order);
  const totalQuestions = exam.totalQuestions ?? sections.reduce((sum, section) => sum + (section.questionCount ?? section.sectionQuestions.length), 0);
  const descriptions: Record<string, string> = {
    LISTENING: "Nghe nội dung và trả lời theo yêu cầu của từng câu hỏi.",
    READING: "Đọc từ, câu hoặc đoạn văn rồi chọn hay điền đáp án phù hợp.",
    WRITING: "Hoàn thành phần viết theo yêu cầu của từng câu hỏi.",
    SPEAKING: "Đọc hoặc nói theo nội dung được yêu cầu trong bài.",
  };

  return <div className="flex flex-col gap-6">
    <Link className="text-sm font-medium text-brand" href="/exams">← Danh sách đề thi</Link>
    <PageHeading title={exam.title} description="Tìm hiểu cấu trúc, số câu và thời gian làm bài trước khi bắt đầu." />
    <div className="hsk-panel flex min-w-0 flex-col gap-4">
      <div className="w-fit"><HskBadge level={exam.hskLevel} /></div>
      <p className="whitespace-pre-line break-words text-sm leading-7 text-slate">{exam.description || `Đề luyện HSK ${exam.hskLevel}. Xem cấu trúc các phần bên dưới để chuẩn bị trước khi làm bài.`}</p>
      {exam.access?.isFree && <p className="text-sm font-medium text-success">Đề miễn phí của HSK {exam.hskLevel} · Bạn có thể làm lại để ôn tập.</p>}
      {exam.access && (!exam.access.isFree || paymentId) && <ExamPurchase examId={exam.id} title={exam.title} access={exam.access} paymentId={paymentId} />}
      {exam.access?.canAttempt !== false && <StartExamButton examId={id} level={exam.hskLevel} title={exam.title} />}
    </div>

    <section aria-labelledby="exam-structure-title" className="hsk-panel min-w-0">
      <h2 id="exam-structure-title" className="hsk-section-title">Cấu trúc đề thi</h2>
      <p className="mt-2 text-sm leading-7 text-slate">{sections.length
        ? `Đề gồm ${totalQuestions} câu hỏi trong ${sections.length} phần, thực hiện theo thứ tự dưới đây.`
        : "Cấu trúc chi tiết sẽ hiển thị khi nội dung đề được bổ sung."}</p>
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-paper p-4"><dt className="text-xs text-slate">Tổng số câu</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-brand dark:text-ink">{totalQuestions} <span className="text-sm font-normal text-slate">câu</span></dd></div>
        <div className="rounded-lg bg-paper p-4"><dt className="text-xs text-slate">Số phần thi</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-brand dark:text-ink">{sections.length} <span className="text-sm font-normal text-slate">phần</span></dd></div>
        <div className="col-span-2 rounded-lg bg-paper p-4 sm:col-span-1"><dt className="text-xs text-slate">Thời gian mặc định</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-brand dark:text-ink">{defaultExamMinutes(exam.hskLevel)} <span className="text-sm font-normal text-slate">phút</span></dd></div>
      </dl>
      {sections.length > 0 && <ol className="mt-5 divide-y divide-mist">{sections.map((section, index) => {
        const skill = section.skill || section.sectionQuestions.find(item => item.question?.skill)?.question?.skill;
        return <li key={section.id} className="flex min-w-0 gap-3 py-4 first:pt-0 last:pb-0">
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand dark:text-ink">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><h3 className="break-words text-base font-semibold text-ink">{section.title}</h3><span className="shrink-0 text-sm font-medium tabular-nums text-brand dark:text-ink">{section.questionCount ?? section.sectionQuestions.length} câu hỏi</span></div>
            <p className="mt-1 text-sm leading-6 text-slate">{skill && descriptions[skill] || "Làm theo yêu cầu của các câu hỏi trong phần này."}</p>
          </div>
        </li>;
      })}</ol>}
      <p className="mt-5 border-t border-mist pt-4 text-xs leading-6 text-slate">Bạn có thể chọn thời gian và cách chấm khi bấm “Bắt đầu làm bài”. Đồng hồ đếm ngược bắt đầu sau khi vào bài; hết giờ, hệ thống tự nộp câu trả lời.</p>
    </section>
    <p className="hsk-notice">Nộp bài và lưu thành công để xem lại trong Lịch sử bài làm. Kết quả là điểm luyện tập nội bộ, không phải chứng chỉ thi HSK chính thức.</p>
    <SourceAttemptHistory kind="exam" sourceId={Number(id)} />
  </div>;
}
