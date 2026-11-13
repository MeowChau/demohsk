import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  backendUrl,
  adminUrl,
  apiRole,
} from "@/lib/api/config";
import { clearSession, refreshSession, setSession } from "@/lib/api/session";
import { canonicalAttemptHref } from "@/lib/attempt-routes";
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const canonical = canonicalAttemptHref(pathname, request.nextUrl.searchParams);
  if (canonical) return NextResponse.redirect(new URL(canonical, request.url), 308);
  if (pathname === "/signup")
    return NextResponse.redirect(new URL("/register", request.url));
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/teacher" ||
    pathname.startsWith("/teacher/")
  )
    return NextResponse.redirect(new URL(adminUrl()));
  if (pathname.startsWith("/onboarding"))
    return NextResponse.redirect(new URL("/profile", request.url));
  const login = () => {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirectTo", pathname + request.nextUrl.search);
    const response = NextResponse.redirect(url);
    clearSession(response);
    return response;
  };
  let token = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!token && !refresh) return login();
  try {
    const me = (access?: string) =>
      fetch(backendUrl() + "/auth/me", {
        headers: { Authorization: "Bearer " + (access || "") },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
    let auth = await me(token);
    let renewed = null;
    if (auth.status === 401 && refresh) {
      renewed = await refreshSession(refresh);
      if (renewed) {
        token = renewed.token;
        auth = await me(token);
      }
    }
    if (auth.status === 401) return login();
    if (!auth.ok)
      return NextResponse.json(
        { message: "Backend HSK chưa sẵn sàng. Vui lòng thử lại." },
        { status: auth.status },
      );
    const user = await auth.json();
    if (apiRole(user) !== "student")
      return NextResponse.redirect(new URL(adminUrl()));
    if (renewed) {
      request.cookies.set(ACCESS_COOKIE, renewed.token);
      request.cookies.set(REFRESH_COOKIE, renewed.refreshToken);
    }
    const response = NextResponse.next({ request });
    if (renewed) setSession(response, renewed);
    return response;
  } catch {
    return NextResponse.json(
      { message: "Chưa kết nối được máy chủ HSK. Vui lòng thử lại." },
      { status: 503 },
    );
  }
}
export const config = {
  matcher: [
    "/signup",
    "/dashboard/:path*",
    "/learning/:path*",
    "/vocabulary/:path*",
    "/practice/:path*",
    "/exams/:path*",
    "/leaderboard/:path*",
    "/games/:path*",
    "/results/:path*",
    "/history/:path*",
    "/rewards/:path*",
    "/support/:path*",
    "/teacher/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/announcements/:path*",
    "/live-classes/:path*",
    "/tutor/:path*",
    "/onboarding/:path*",
  ],
};
