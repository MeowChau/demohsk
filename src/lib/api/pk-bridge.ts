import "server-only";
import { createHash } from "node:crypto";
import { io, type Socket } from "socket.io-client";
import { backendUrl } from "./config";
import type { PkCommand } from "@/types/pk";

type Envelope = { event: string; payload: unknown };
type Bridge = { socket: Socket; listeners: Set<(message: Envelope) => void>; ready: boolean; connected?: Envelope; match?: Envelope; latest?: Envelope; cleanup?: NodeJS.Timeout };
const globalBridge = globalThis as typeof globalThis & { hskPkConnections?: Map<string, Bridge> };
const connections = globalBridge.hskPkConnections ||= new Map<string, Bridge>();
const keyFor = (token: string, level: number) => createHash("sha256").update(token + ":" + level).digest("hex");
const events = new Set(["pk_connected", "online_count_update", "match_found", "player_ready_update", "game_started", "turn_changed", "answer_result", "game_finished", "match_cancelled", "exception"]);

function connection(token: string, level: number, roomId?: string) {
  const key = keyFor(token, level);
  let bridge = connections.get(key);
  if (bridge) { if (bridge.cleanup) clearTimeout(bridge.cleanup); return { key, bridge }; }
  if (connections.size >= 200) throw new Error("Phòng PK đang bận. Vui lòng thử lại sau.");
  const socket = io(process.env.HSK_SOCKET_URL || new URL("/game", backendUrl()).toString(), { auth: { token }, query: { hskLevel: level, ...(roomId ? { roomId } : {}) }, transports: ["websocket"], timeout: 10000, reconnectionAttempts: 3, autoConnect: false });
  bridge = { socket, listeners: new Set(), ready: false };
  const current = bridge;
  const publish = (message: Envelope) => { for (const listener of [...current.listeners]) listener(message); };
  socket.onAny((event: string, payload: unknown) => {
    if (!events.has(event)) return;
    const message = { event, payload };
    if (event === "pk_connected") { current.ready = true; current.connected = message; }
    if (event === "match_found" || event === "game_started") current.match = message;
    if (["player_ready_update", "turn_changed", "answer_result", "game_finished", "match_cancelled"].includes(event)) current.latest = message;
    if (event === "match_found") current.latest = undefined;
    publish(message);
  });
  socket.on("disconnect", () => { current.ready = false; publish({ event: "connection_closed", payload: { message: "Kết nối PK đã đóng. Bạn có thể kết nối lại để tiếp tục." } }); });
  socket.on("connect_error", () => { current.ready = false; publish({ event: "connection_error", payload: { message: "Chưa kết nối được phòng PK. Vui lòng thử lại." } }); });
  connections.set(key, current);
  return { key, bridge: current };
}

export function pkEventStream(token: string, level: number, signal: AbortSignal, roomId?: string) {
  const { key, bridge } = connection(token, level, roomId);
  const encoder = new TextEncoder();
  let detach = () => {};
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (message: Envelope) => { if (!closed) try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`)); } catch { detach(); } };
      const heartbeat = setInterval(() => { if (!closed) try { controller.enqueue(encoder.encode(": keep-alive\n\n")); } catch { detach(); } }, 15000);
      heartbeat.unref();
      detach = () => {
        if (closed) return;
        closed = true; clearInterval(heartbeat); bridge.listeners.delete(send); signal.removeEventListener("abort", detach);
        if (!bridge.listeners.size) {
          bridge.cleanup = setTimeout(() => { if (!bridge.listeners.size && connections.get(key) === bridge) { connections.delete(key); bridge.socket.disconnect(); } }, 3000);
          bridge.cleanup.unref();
        }
        try { controller.close(); } catch { /* Stream already cancelled. */ }
      };
      if (signal.aborted) { detach(); return; }
      bridge.listeners.add(send); signal.addEventListener("abort", detach, { once: true });
      send({ event: "connecting", payload: null });
      if (bridge.connected && bridge.ready && bridge.socket.connected) send(bridge.connected);
      if (bridge.match) send(bridge.match);
      if (bridge.latest) send(bridge.latest);
      if (!bridge.socket.connected) bridge.socket.connect();
    },
    cancel() { detach(); },
  });
}

export async function sendPkCommand(token: string, command: PkCommand): Promise<{ ok: boolean; message?: string }> {
  const bridge = connections.get(keyFor(token, command.hskLevel));
  if (!bridge?.ready || !bridge.socket.connected || !bridge.listeners.size) throw new Error("Chưa kết nối phòng PK. Bấm Kết nối lại rồi thử lại.");
  const payload = command.event === "submit_answer" ? { roomId: command.roomId, questionId: command.questionId, optionId: command.optionId } : command.event === "player_ready" ? { roomId: command.roomId } : {};
  return bridge.socket.timeout(10000).emitWithAck(command.event, payload) as Promise<{ ok: boolean; message?: string }>;
}
