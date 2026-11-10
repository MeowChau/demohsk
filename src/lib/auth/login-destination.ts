import { apiRole } from "@/lib/api/config";
import type { HskUser } from "@/lib/api/types";

export function loginDestination(user: HskUser, redirectTo?: string | null) {
  const role = apiRole(user);
  if (role === "admin") return "/admin";
  if (role === "teacher") return "/teacher";
  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//") || /[\\\u0000-\u001f]/.test(redirectTo)) return "/dashboard";
  try {
    const url = new URL(redirectTo, "https://hsk.invalid");
    return url.origin === "https://hsk.invalid" ? url.pathname + url.search + url.hash : "/dashboard";
  } catch { return "/dashboard"; }
}
