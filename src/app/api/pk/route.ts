import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/server";
import { ACCESS_COOKIE, apiRole } from "@/lib/api/config";
import { pkEventStream, sendPkCommand } from "@/lib/api/pk-bridge";
import { validHskLevel } from "@/lib/hsk";
import { parsePkCommand, validPkRoom } from "@/types/pk";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow the SSE request to span a complete PK match on Vercel Hobby/Pro.
export const maxDuration = 300;
async function identity(request: NextRequest): Promise<{ token: string; currentLevel: number | null } | { response: NextResponse }> {
  try {
    const user = await getApiUser();
    const token = request.cookies.get(ACCESS_COOKIE)?.value;
    if (!user || !token || apiRole(user) !== "student") return { response: NextResponse.json({ message: "Vui lòng đăng nhập tài khoản học viên." }, { status: 401 }) };
    return { token, currentLevel: validHskLevel(user.currentHskLevel) };
  } catch { return { response: NextResponse.json({ message: "Chưa kết nối được hệ thống HSK. Vui lòng thử lại." }, { status: 503 }) }; }
}
function profileLevelError(level: number, currentLevel: number | null) {
  if (currentLevel === null) return NextResponse.json({ message: "Vui lòng cập nhật mức HSK hiện tại trong hồ sơ trước khi ghép trận." }, { status: 422 });
  if (level !== currentLevel) return NextResponse.json({ message: `Bạn chỉ có thể thi đấu PK ở mức HSK ${currentLevel} theo hồ sơ hiện tại. Vui lòng quay lại sảnh PK.` }, { status: 403 });
  return null;
}
export async function GET(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ message: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  const session = await identity(request);
  if ("response" in session) return session.response;
  const token = session.token;
  const level = Number(request.nextUrl.searchParams.get("hskLevel"));
  if (!Number.isInteger(level) || level < 1 || level > 9) return NextResponse.json({ message: "Cấp độ PK không hợp lệ." }, { status: 422 });
  const levelError = profileLevelError(level, session.currentLevel);
  if (levelError) return levelError;
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
    // A profile change must not prevent leaving an already active room or queue.
    if (command.event !== "cancel_match") {
      const levelError = profileLevelError(command.hskLevel, session.currentLevel);
      if (levelError) return levelError;
    }
    const result = await sendPkCommand(token, command);
    return NextResponse.json(result, { status: result.ok ? 200 : 422, headers: { "Cache-Control": "no-store" } });
  } catch (cause) { return NextResponse.json({ message: cause instanceof Error ? cause.message : "Chưa gửi được thao tác PK." }, { status: 422 }); }
}
