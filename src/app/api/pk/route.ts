import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/server";
import { ACCESS_COOKIE, apiRole } from "@/lib/api/config";
import { pkEventStream, sendPkCommand } from "@/lib/api/pk-bridge";
import { parsePkCommand, validPkRoom } from "@/types/pk";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow the SSE request to span a complete PK match on Vercel Hobby/Pro.
export const maxDuration = 300;
async function identity(request: NextRequest): Promise<{ token: string } | { response: NextResponse }> {
  try {
    const user = await getApiUser();
    const token = request.cookies.get(ACCESS_COOKIE)?.value;
    if (!user || !token || apiRole(user) !== "student") return { response: NextResponse.json({ message: "Vui lòng đăng nhập tài khoản học viên." }, { status: 401 }) };
    return { token };
  } catch { return { response: NextResponse.json({ message: "Chưa kết nối được hệ thống HSK. Vui lòng thử lại." }, { status: 503 }) }; }
}
export async function GET(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ message: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  const session = await identity(request);
  if ("response" in session) return session.response;
  const token = session.token;
  const level = Number(request.nextUrl.searchParams.get("hskLevel"));
  if (!Number.isInteger(level) || level < 1 || level > 9) return NextResponse.json({ message: "Cấp độ PK không hợp lệ." }, { status: 422 });
  try {
    return new Response(pkEventStream(token, level, request.signal, validPkRoom(request.nextUrl.searchParams.get("roomId"))), { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store", "Connection": "keep-alive", "X-Accel-Buffering": "no" } });
  } catch { return NextResponse.json({ message: "Phòng PK chưa sẵn sàng. Vui lòng thử lại." }, { status: 503 }); }
}
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ message: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  const session = await identity(request);
  if ("response" in session) return session.response;
  const token = session.token;
  if (Number(request.headers.get("content-length")) > 2048) return NextResponse.json({ message: "Dữ liệu quá lớn." }, { status: 413 });
  try {
    const command = parsePkCommand(await request.json());
    const result = await sendPkCommand(token, command);
    return NextResponse.json(result, { status: result.ok ? 200 : 422, headers: { "Cache-Control": "no-store" } });
  } catch (cause) { return NextResponse.json({ message: cause instanceof Error ? cause.message : "Chưa gửi được thao tác PK." }, { status: 422 }); }
}
