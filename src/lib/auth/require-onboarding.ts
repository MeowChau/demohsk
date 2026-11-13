import { redirect } from "next/navigation";
import { requireApiUser } from "@/lib/api/server";
import { adminUrl, apiRole } from "@/lib/api/config";
export async function requireOnboarding() {
  const user = await requireApiUser();
  if (apiRole(user) !== "student") redirect(adminUrl());
  return user;
}
