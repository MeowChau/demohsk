import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ACCESS_COOKIE, backendEndpoint, apiRole } from "./config";
import { ApiError, backendFieldErrors, errorMessage } from "./client";
import type { HskUser } from "./types";

export async function serverApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string")
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(backendEndpoint(path), {
      ...init,
      headers,
      cache: "no-store",
      signal: init.signal || AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(
      "Chưa kết nối được máy chủ HSK. Vui lòng thử lại.",
      503,
    );
  }
  const data: unknown =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(errorMessage(data, response.status), response.status, backendFieldErrors(data));
  return data as T;
}
export const getApiUser = cache(async (): Promise<HskUser | null> => {
  if (!(await cookies()).get(ACCESS_COOKIE)?.value) return null;
  try {
    return await serverApi<HskUser>("auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});
export async function requireApiUser(): Promise<HskUser> {
  const user = await getApiUser();
  if (!user) redirect("/login");
  return user;
}
export async function getLegacyUser() {
  const user = await getApiUser();
  return user
    ? {
        ...user,
        id: String(user.id),
        appRole: apiRole(user),
        email_confirmed_at: user.emailVerifiedAt,
      }
    : null;
}
