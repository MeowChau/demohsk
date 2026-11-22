import type { LearningScoreSummary } from "@/lib/learning-scores";
import { serverApi, requireApiUser } from "@/lib/api/server";
import { activityStats } from "@/lib/api/learning";
import { getDashboardTopics } from "@/lib/api/catalog";
import DashboardClient from "./dashboard-client";
import { LearningAnalytics } from "@/components/dashboard/learning-analytics";
export default async function DashboardPage(){
 const user=await requireApiUser();const [topics,stats,assessment]=await Promise.all([getDashboardTopics(user.currentHskLevel || 1),activityStats(user),serverApi<LearningScoreSummary>("learning-scores?hskLevel="+(user.currentHskLevel||1)).catch(()=>null)]);
 const student={current_band:user.currentHskLevel||null,target_band:user.targetHskLevel||null};
 const {xpTotal,streak,levelInfo}=stats;
  return (
    <div className="flex flex-col gap-8"><DashboardClient key={String(user.id)}
      topics={topics.topics}
      topicCount={topics.total}
      student={student}
      xpTotal={xpTotal}
      streak={streak}
      levelInfo={levelInfo}
      initialAssessment={assessment}
      assessmentLoadedAt={Date.now()}
      analytics={stats.analytics}
    /><LearningAnalytics data={stats.analytics} dailyMinutes={user.dailyStudyTime} /></div>
  )
}
