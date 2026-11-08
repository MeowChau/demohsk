import type { HskUser } from "@/lib/api/types";

export function userDisplayName(user: Pick<HskUser, "username" | "email">): string {
  return user.username?.trim() || user.email?.trim() || "Học viên";
}
