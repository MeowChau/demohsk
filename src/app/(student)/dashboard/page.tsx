import type { LearningScoreSummary } from "@/lib/learning-scores";
import { serverApi, requireApiUser } from "@/lib/api/server";
import { learningViews, activityStats } from "@/lib/api/learning";
import DashboardClient from "./dashboard-client";
import { LearningAnalytics } from "@/components/dashboard/learning-analytics";
export default async function DashboardPage(){
 const user=await requireApiUser();const [views,stats]=await Promise.all([learningViews(user),activityStats(user)]);
 const student={current_band:user.currentHskLevel||null,target_band:user.targetHskLevel||null};
 const {xpTotal,streak,levelInfo}=stats;const assessment=await serverApi<LearningScoreSummary>("learning-scores?hskLevel="+(user.currentHskLevel||1)).catch(()=>null);
  return (
    <div className="flex flex-col gap-8"><DashboardClient key={String(user.id)}
      views={views}
      student={student}
      xpTotal={xpTotal}
      streak={streak}
      levelInfo={levelInfo}
      initialAssessment={assessment}
    /><LearningAnalytics data={stats.analytics} dailyMinutes={user.dailyStudyTime} /></div>
  )
}
