"use server";

import { redirect } from "next/navigation";
import { attemptHref } from "@/lib/attempt-routes";
import { requireApiUser } from "@/lib/api/server";

export async function startAttemptAction(testid: string) {
  await requireApiUser();
  redirect(attemptHref(testid));
}
