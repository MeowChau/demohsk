import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, backendUrl } from "@/lib/api/config";
import {
  clearSession,
  refreshSession,
  setSession,
  type ApiSession,
} from "@/lib/api/session";
export const dynamic = "force-dynamic";
const allowed: Record<string, RegExp[]> = {
  GET: [
    /^auth\/me$/,
    /^vocabulary(?:\/topic-counts|\/\d+)?$/,
    /^practice-sets(?:\/topics|\/summary|\/\d+)?$/,
    /^exams(?:\/\d+)?$/,
    /^analytics\/dashboard$/,
    /^leaderboard\/streak$/,
  ],
  POST: [
    /^auth\/(email\/(login|register|confirm|resend|confirm\/new)|forgot\/password|reset\/password|logout)$/,
    /^analytics\/(ping|vocabulary-progress)$/,
  ],
  PATCH: [/^auth\/me$/, /^users\/me\/study-goals$/],
  DELETE: [/^auth\/me$/],
};
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = (await context.params).path.join("/");
  if (!allowed[request.method]?.some((rule) => rule.test(path)))
    return NextResponse.json(
      { message: "API này không dành cho học viên." },
      { status: 404 },
    );
  const origin = request.headers.get("origin");
  if (request.method !== "GET" && origin && origin !== request.nextUrl.origin)
    return NextResponse.json(
      { message: "Nguồn yêu cầu không hợp lệ." },
      { status: 403 },
    );
  let renewed: ApiSession | null = null;
  try {
    const body = request.method === "GET" ? undefined : await request.text();
    if (body && body.length > 150000)
      return NextResponse.json(
        { message: "Dữ liệu quá lớn." },
        { status: 413 },
      );
    const send = (token?: string) =>
      fetch(`${backendUrl()}/${path}${request.nextUrl.search}`, {
        method: request.method,
        body: body || undefined,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
    let upstream = await send(request.cookies.get(ACCESS_COOKIE)?.value);
    if (
      upstream.status === 401 &&
      !path.startsWith("auth/email/") &&
      request.cookies.get(REFRESH_COOKIE)?.value
    ) {
      renewed = await refreshSession(
        request.cookies.get(REFRESH_COOKIE)!.value,
      );
      if (renewed) upstream = await send(renewed.token);
    }
    let data: unknown =
      upstream.status === 204
        ? null
        : await upstream
            .json()
            .catch(() => ({ message: "Backend trả dữ liệu không hợp lệ." }));
    if (path === "auth/email/login" && upstream.ok) {
      const login = data as ApiSession & { user: unknown };
      renewed = login;
      data = { user: login.user };
    }
    const response =
      upstream.status === 204
        ? new NextResponse(null, { status: 204 })
        : NextResponse.json(data, { status: upstream.status });
    response.headers.set("Cache-Control", "no-store");
    if (renewed) setSession(response, renewed);
    if (
      path === "auth/logout" ||
      (path === "auth/me" && request.method === "DELETE" && upstream.ok) ||
      upstream.status === 401
    )
      clearSession(response);
    return response;
  } catch {
    const response = NextResponse.json(
      {
        message:
          "Chưa kết nối được máy chủ HSK. Kiểm tra backend và HSK_API_URL.",
      },
      { status: 503 },
    );
    if (path === "auth/logout") clearSession(response);
    else if (renewed) setSession(response, renewed);
    return response;
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
