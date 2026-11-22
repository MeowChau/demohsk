import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ACCESS_COOKIE, REFRESH_COOKIE, backendEndpoint } from "@/lib/api/config";
import { errorMessage } from "@/lib/api/client";
import { googleClientId, GOOGLE_NONCE_COOKIE, matchesGoogleNonce } from "@/lib/auth/google";
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
    /^exam-payments\/[0-9a-f-]{36}$/i,
    /^analytics\/dashboard$/,
    /^learning-scores$/,
    /^learning-scores\/history(?:\/[0-9a-f-]{36})?$/i,
    /^leaderboard\/streak$/,
    /^game\/offline\/(words|top-scores)$/,
    /^game\/pk\/history$/,
  ],
  POST: [
    /^auth\/google\/login$/,
    /^auth\/(email\/(login|register|confirm|resend|confirm\/new)|forgot\/password|reset\/password|logout)$/,
    /^analytics\/(ping|vocabulary-progress)$/,
    /^learning-scores\/submit$/,
    /^exam-payments\/exams\/\d+\/checkout$/,
    /^game\/offline\/submit$/,
    /^ai\/(writing-assessment|speaking\/pronunciation-assessment)$/,
  ],
  PATCH: [/^auth\/me$/, /^users\/me\/study-goals$/],
  DELETE: [/^auth\/me$/],
};
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = (await context.params).path.join("/");
  const isGoogleLogin = request.method === "POST" && path === "auth/google/login";
  const isLogin = request.method === "POST" && (path === "auth/email/login" || isGoogleLogin);
  if (!allowed[request.method]?.some((rule) => rule.test(path)))
    return NextResponse.json(
      { message: "API này không dành cho học viên." },
      { status: 404 },
    );
  const origin = request.headers.get("origin");
  if (isGoogleLogin && (origin !== request.nextUrl.origin || !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")))
    return NextResponse.json({ message: "Nguồn yêu cầu đăng nhập không hợp lệ." }, { status: 403 });
  if (request.method !== "GET" && origin && origin !== request.nextUrl.origin)
    return NextResponse.json(
      { message: "Nguồn yêu cầu không hợp lệ." },
      { status: 403 },
    );
  let renewed: ApiSession | null = null;
  try {
    const isAudio = path === "ai/speaking/pronunciation-assessment";
    let body: string | FormData | undefined;
    if (isAudio) {
      if (Number(request.headers.get("content-length")) > 11 * 1024 * 1024)
        return NextResponse.json({ message: "Tệp ghi âm quá lớn." }, { status: 413 });
      body = await request.formData();
      const audio = body.get("audio");
      const reference = body.get("referenceText");
      if (!(audio instanceof File) || !audio.size || audio.size > 10 * 1024 * 1024 || typeof reference !== "string" || !reference.trim() || reference.length > 5000)
        return NextResponse.json({ message: "Chọn bản ghi WAV hợp lệ và nhập nội dung cần đọc." }, { status: 422 });
    } else body = request.method === "GET" ? undefined : await request.text();
    if (typeof body === "string" && body.length > 150000)
      return NextResponse.json(
        { message: "Dữ liệu quá lớn." },
        { status: 413 },
      );
    if (isGoogleLogin) {
      if (!googleClientId()) return NextResponse.json({ message: "Đăng nhập Google hiện chưa được bật. Bạn có thể đăng nhập bằng email." }, { status: 503 });
      let credential: unknown;
      try { credential = JSON.parse(String(body)).idToken; } catch { /* Reject malformed input below. */ }
      if (!matchesGoogleNonce(credential, request.cookies.get(GOOGLE_NONCE_COOKIE)?.value))
        return NextResponse.json({ message: "Phiên đăng nhập Google đã hết hạn. Vui lòng chọn tài khoản Google lại.", code: "googleChallengeExpired" }, { status: 403 });
      body = JSON.stringify({ idToken: credential });
    }
    const send = (token?: string) =>
      fetch(`${backendEndpoint(path)}${request.nextUrl.search}`, {
        method: request.method,
        body: body || undefined,
        headers: {
          ...(!isAudio ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(path.startsWith("ai/") ? 45000 : 20000),
      });
    let upstream = await send(isLogin ? undefined : request.cookies.get(ACCESS_COOKIE)?.value);
    if (
      upstream.status === 401 &&
      !isLogin &&
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
    if (isLogin && upstream.ok) {
      const login = data as ApiSession & { user: unknown };
      if (isGoogleLogin) {
        const user = login?.user as { id?: unknown; status?: { id?: unknown } } | undefined;
        if (!user?.id || Number(user.status?.id) !== 1) {
          const response = NextResponse.json({ message: errorMessage({ errors: { status: "accountNotActive" } }, 422), code: "accountNotActive" }, { status: 422 });
          clearSession(response);
          return response;
        }
        if (typeof login.token !== "string" || !login.token || typeof login.refreshToken !== "string" || !login.refreshToken || !Number.isFinite(login.tokenExpires))
          return NextResponse.json({ message: "Chưa xác thực được tài khoản Google. Vui lòng thử lại." }, { status: 502 });
      }
      renewed = login;
      data = { user: login.user };
    }
    if (isGoogleLogin && !upstream.ok) {
      const failure = data as { code?: unknown; errors?: { status?: unknown } } | null;
      if (upstream.status === 422 && failure?.code === "accountPendingApproval" && failure.errors?.status === "accountNotActive") {
        const response = NextResponse.json({ status: "pending_approval", message: "Tài khoản của bạn đang chờ quản trị viên duyệt. Sau khi được duyệt, bạn có thể đăng nhập lại bằng Google." }, { status: 202, headers: { "Cache-Control": "no-store" } });
        clearSession(response);
        return response;
      }
      data = { message: errorMessage(data, upstream.status), ...(failure?.errors?.status === "accountNotActive" ? { code: "accountNotActive" } : {}) };
    }
    if (request.method === "POST" && path === "learning-scores/submit" && upstream.ok)
      revalidatePath("/", "layout");
    if (path.startsWith("exam-payments/") && upstream.ok && (data as { accessGranted?: boolean } | null)?.accessGranted)
      revalidatePath("/exams");
    const response =
      upstream.status === 204
        ? new NextResponse(null, { status: 204 })
        : NextResponse.json(data, { status: upstream.status });
    response.headers.set("Cache-Control", "no-store");
    if (isGoogleLogin) {
      if (upstream.ok && renewed) response.cookies.delete(GOOGLE_NONCE_COOKIE);
      if (!upstream.ok) clearSession(response);
    }
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
