import { getApiUser } from "@/lib/api/server";
export async function getOnboardingForProfile(){const user=await getApiUser();return user?{current_band:user.currentHskLevel,target_band:user.targetHskLevel,onboarding_completed:true}:null;}
