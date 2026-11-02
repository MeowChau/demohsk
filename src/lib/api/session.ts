import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, backendUrl } from "./config";
export interface ApiSession {
  token: string;
  refreshToken: string;
  tokenExpires: number;
}
const inFlight = new Map<string, Promise<ApiSession | null>>();
export function setSession(response: NextResponse, session: ApiSession) {
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
  response.cookies.set(ACCESS_COOKIE, session.token, options);
  response.cookies.set(REFRESH_COOKIE, session.refreshToken, options);
}
export function clearSession(response: NextResponse) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE])
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
}
export async function refreshSession(
  refreshToken: string,
): Promise<ApiSession | null> {
  const existing = inFlight.get(refreshToken);
  if (existing) return existing;
  const pending = (async () => {
    const result = await fetch(`${backendUrl()}/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    return result.ok ? ((await result.json()) as ApiSession) : null;
  })();
  inFlight.set(refreshToken, pending);
  try {
    return await pending;
  } finally {
    setTimeout(() => inFlight.delete(refreshToken), 5000);
  }
}
