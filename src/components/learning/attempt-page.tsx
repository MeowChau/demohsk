import Link from "next/link";
import { notFound } from "next/navigation";
import { testForTaking } from "@/lib/api/learning";
import { ApiError } from "@/lib/api/client";
import { examDetailHref, parseAttemptReference } from "@/lib/attempt-routes";
import { practicePath } from "@/lib/catalog-query";
import { STUDY_MODULES } from "@/lib/hsk";
import type { Skill } from "@/types/assessment";
import { AttemptForm } from "./attempt-form";
import { StudyTracker } from "@/components/shell/study-tracker";

export async function AttemptContent({ reference }: { reference: string }) {
  const parsed = parseAttemptReference(reference);
  if (!parsed) notFound();
  const data = await testForTaking(parsed.reference).catch(error => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const skill = Object.keys(data.questionsBySkill)[0] as Skill | undefined;
  const isExam = parsed.kind === "exam";

  return (
    <div className="flex flex-col gap-6">
      <StudyTracker module={isExam ? STUDY_MODULES.exam : (skill && STUDY_MODULES[skill]) || STUDY_MODULES.Reading} />
      <Link className="w-fit text-sm font-medium text-brand" href={isExam ? examDetailHref(parsed.id) : practicePath(skill)}>
        {isExam ? "← Chi tiết đề thi" : "← Danh sách bài luyện"}
      </Link>
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink dark:text-white">{data.test.title}</h1>
        <p className="text-sm text-slate-soft">{data.test.total_marks} câu hỏi · Tự luyện</p>
      </div>
      <AttemptForm key={parsed.reference} attemptid={parsed.reference} testid={parsed.reference} data={data} recordScores />
    </div>
  );
}
