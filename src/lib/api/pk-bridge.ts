import "server-only";
import { io } from "socket.io-client";
import { backendUrl } from "./config";
import type { PkCommand } from "@/types/pk";

type Envelope = { event: string; payload: unknown };
type Reply = { ok: boolean; message?: string };
const events = new Set(["pk_connected", "online_count_update", "match_found", "player_ready_update", "game_started", "turn_changed", "answer_result", "game_finished", "match_cancelled", "exception"]);

function createSocket(token: string, level: number, roomId?: string) {
  return io(new URL("/game", backendUrl()).toString(), {
    auth: { token },
    query: { hskLevel: level, ...(roomId ? { roomId } : {}) },
    transports: ["websocket"],
    timeout: 10000,
    reconnection: false,
    forceNew: true,
    autoConnect: false,
  });
}

// Vercel may route GET and POST to separate instances. Each HTTP request owns
// its socket instead of depending on another request's process memory.
export function pkEventStream(token: string, level: number, signal: AbortSignal, roomId?: string) {
  const socket = createSocket(token, level, roomId);
  const encoder = new TextEncoder();
  let detach = () => {};
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const heartbeat: { timer?: NodeJS.Timeout } = {};
      detach = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat.timer);
        signal.removeEventListener("abort", detach);
        socket.offAny();
        socket.removeAllListeners();
        socket.disconnect();
        try { controller.close(); } catch { /* Stream already cancelled. */ }
      };
      const send = (message: Envelope) => {
        if (!closed) try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`)); } catch { detach(); }
      };
      if (signal.aborted) { detach(); return; }
      socket.onAny((event: string, payload: unknown) => {
        if (events.has(event)) send({ event, payload });
      });
      socket.on("disconnect", () => {
        send({ event: "connection_closed", payload: { message: "Kết nối PK đã đóng. Bạn có thể kết nối lại để tiếp tục." } });
        detach();
      });
      socket.on("connect_error", () => {
        send({ event: "connection_error", payload: { message: "Chưa kết nối được phòng PK. Vui lòng thử lại." } });
        detach();
      });
      signal.addEventListener("abort", detach, { once: true });
      heartbeat.timer = setInterval(() => {
        if (!closed) try { controller.enqueue(encoder.encode(": keep-alive\n\n")); } catch { detach(); }
      }, 15000);
      heartbeat.timer.unref();
      send({ event: "connecting", payload: null });
      socket.connect();
    },
    cancel() { detach(); },
  });
}

export function sendPkCommand(token: string, command: PkCommand): Promise<Reply> {
  // The backend already broadcasts committed events to every socket in the
  // authenticated account-room, including the independent SSE connection.
  const socket = createSocket(token, command.hskLevel, command.roomId);
  const payload = command.event === "submit_answer"
    ? { roomId: command.roomId, questionId: command.questionId, optionId: command.optionId }
    : command.event === "player_ready" ? { roomId: command.roomId } : {};
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error, reply?: Reply) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      socket.offAny();
      socket.removeAllListeners();
      socket.disconnect();
      if (error) reject(error);
      else resolve(reply!);
    };
    const deadline = setTimeout(() => finish(new Error("Máy chủ PK chưa phản hồi. Vui lòng thử lại.")), 20000);
    deadline.unref();
    // Wait for authentication and Redis presence, not just transport connection.
    socket.once("pk_connected", () => {
      void socket.timeout(10000).emitWithAck(command.event, payload).then((value: unknown) => {
        const reply = value as { ok?: unknown; message?: unknown } | null;
        if (!reply || typeof reply.ok !== "boolean") {
          finish(new Error("Máy chủ PK trả về phản hồi không hợp lệ."));
          return;
        }
        finish(undefined, { ok: reply.ok, ...(typeof reply.message === "string" ? { message: reply.message } : {}) });
      }).catch(() => finish(new Error("Chưa nhận được xác nhận từ máy chủ PK. Vui lòng thử lại.")));
    });
    socket.once("connect_error", () => finish(new Error("Chưa kết nối được phòng PK. Vui lòng thử lại.")));
    socket.once("disconnect", () => finish(new Error("Kết nối PK bị gián đoạn. Vui lòng thử lại.")));
    socket.once("exception", (value: { message?: unknown } | null) => finish(new Error(
      typeof value?.message === "string" ? value.message : "Máy chủ chưa chấp nhận thao tác PK.",
    )));
    socket.connect();
  });
}
