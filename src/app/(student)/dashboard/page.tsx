import { requireApiUser } from "@/lib/api/server";
import { learningViews, activityStats } from "@/lib/api/learning";
import DashboardClient from "./dashboard-client";
export default async function DashboardPage(){
 const user=await requireApiUser();const [views,stats]=await Promise.all([learningViews(user),activityStats(user)]);
 const student={current_band:user.currentHskLevel||null,target_band:user.targetHskLevel||null};
 const {xpTotal,streak,levelInfo}=stats;const skillBands={};
  return (
    <DashboardClient
      views={views}
      student={student}
      xpTotal={xpTotal}
      streak={streak}
      levelInfo={levelInfo}
      skillBands={skillBands}
    />
  )
}
