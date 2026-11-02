import { requireApiUser } from "@/lib/api/server";
export async function requireOnboarding(){return requireApiUser();}
