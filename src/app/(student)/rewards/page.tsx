import { requireApiUser } from "@/lib/api/server";
import { activityStats } from "@/lib/api/learning";
import RewardsClient from "./rewards-client";
export default async function RewardsPage(){const user=await requireApiUser();return <RewardsClient stats={await activityStats(user)} mode="real"/>;}
