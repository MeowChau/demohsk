import { NextRequest, NextResponse } from "next/server";
import { createGoogleNonce, googleClientId, GOOGLE_NONCE_COOKIE, GOOGLE_NONCE_MAX_AGE } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const clientId = googleClientId();
  if (!clientId) return NextResponse.json({ message: "Đăng nhập Google hiện chưa được bật. Bạn có thể đăng nhập bằng email." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const previous = request.cookies.get(GOOGLE_NONCE_COOKIE)?.value;
  const nonce = previous && /^[\w-]{43}$/.test(previous) ? previous : createGoogleNonce();
  const response = NextResponse.json({ clientId, nonce }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(GOOGLE_NONCE_COOKIE, nonce, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: GOOGLE_NONCE_MAX_AGE,
  });
  return response;
}
