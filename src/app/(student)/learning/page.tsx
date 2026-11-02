import { requireApiUser } from "@/lib/api/server";
import { LearningTabs } from "./learning-tabs";
import { LessonsPanel } from "./lessons-panel";
import { VocabularyPanel } from "./vocabulary-panel";
export default async function LearningPage(){const user=await requireApiUser();const studentid=String(user.id);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-navy dark:text-white">Learning</h1>
      <LearningTabs
        lessons={<LessonsPanel studentid={studentid} />}
        vocabulary={user ? <VocabularyPanel userid={String(user.id)} /> : null}
      />
    </div>
  );
}
