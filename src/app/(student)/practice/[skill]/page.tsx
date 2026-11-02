import { notFound } from "next/navigation";
import { practiceTests } from "@/lib/api/learning";
import { requireApiUser } from "@/lib/api/server";
import type { Skill } from "@/types/assessment";
import { startAttemptAction } from "../actions";
const SKILL_LABEL:Record<string,Skill>={listening:"Listening",reading:"Reading",writing:"Writing",speaking:"Speaking"};
export default async function PracticeSkillPage({params}:{params:Promise<{skill:string}>}){
 const {skill:slug}=await params;const skill=SKILL_LABEL[slug];if(!skill)notFound();await requireApiUser();const tests=await practiceTests(skill);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold text-navy dark:text-white">{skill} Practice</h1>
      {(skill === "Writing" || skill === "Speaking") && (
        <p className="rounded-md border border-teal/30 bg-teal/5 px-4 py-2 text-sm text-slate-soft">
          Đây là bài tự luyện. Bạn có thể tải bản sao câu trả lời sau khi làm bài; kết quả chưa được chấm hoặc lưu vào tài khoản.
        </p>
      )}
      {tests.length === 0 ? (
        <p className="text-sm text-slate-soft">
          No {skill.toLowerCase()} tests available in your enrolled courses yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {tests.map((t) => (
            <form key={t.testid} action={startAttemptAction.bind(null, t.testid)}>
              <button
                type="submit"
                className="flex w-full items-center justify-between rounded-md border border-mist bg-surface px-4 py-3 text-left transition-colors hover:border-teal"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{t.title}</p>
                  <p className="text-xs text-slate-soft">
                    {t.category} · {t.total_marks} questions
                  </p>
                </div>
                <span className="text-xs font-semibold text-teal">Start →</span>
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
