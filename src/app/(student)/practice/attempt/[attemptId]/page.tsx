import { testForTaking } from "@/lib/api/learning";

import { AttemptForm } from "./attempt-form";
import { StudyTracker } from "@/components/shell/study-tracker";
import { STUDY_MODULES } from "@/lib/hsk";
import type { Skill } from "@/types/assessment";

export default async function AttemptPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ testid?: string }>;
}) {
  const { attemptId } = await params;
  const { testid } = await searchParams;

  if (!testid) {
    return <p className="text-sm text-danger"> Thiếu mã bài luyện. </p>;
  }

  const data = await testForTaking(testid);

  if (!data) {
    return <p className="text-sm text-danger"> Không tìm thấy bài luyện. </p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <StudyTracker module={testid.startsWith("exam-") ? STUDY_MODULES.exam : STUDY_MODULES[Object.keys(data.questionsBySkill)[0] as Skill] || STUDY_MODULES.Reading} />
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink dark:text-white">{data.test.title}</h1>
        <p className="text-sm text-slate-soft">
          {data.test.total_marks}  câu hỏi · Tự luyện </p>
      </div>
      <AttemptForm attemptid={attemptId} testid={testid} data={data} />
    </div>
  );
}
