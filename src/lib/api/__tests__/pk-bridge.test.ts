jest.mock("server-only", () => ({}));
jest.mock("socket.io-client", () => ({ io: jest.fn() }));
import { io } from "socket.io-client";
import { pkEventStream, sendPkCommand } from "../pk-bridge";

function mockSocket() {
  let anyListener: (event: string, payload: unknown) => void = () => {};
  const callbacks = new Map<string, (...args: unknown[]) => void>();
  const acknowledge = jest.fn().mockResolvedValue({ ok: true });
  const socket = {
    connected: false,
    on: jest.fn((event: string, callback: (...args: unknown[]) => void) => { callbacks.set(event, callback); }),
    once: jest.fn((event: string, callback: (...args: unknown[]) => void) => { callbacks.set(event, callback); }),
    onAny: jest.fn((callback: typeof anyListener) => { anyListener = callback; }),
    offAny: jest.fn(() => { anyListener = () => {}; }),
    removeAllListeners: jest.fn(() => callbacks.clear()),
    connect: jest.fn(), disconnect: jest.fn(), timeout: jest.fn(() => ({ emitWithAck: acknowledge })),
  };
  socket.connect.mockImplementation(() => { socket.connected = true; });
  socket.disconnect.mockImplementation(() => { socket.connected = false; callbacks.get("disconnect")?.(); });
  const emit = (event: string, payload?: unknown) => { anyListener(event, payload); callbacks.get(event)?.(payload); };
  return { socket, acknowledge, emit };
}
function supply(value: ReturnType<typeof mockSocket>) {
  jest.mocked(io).mockReturnValueOnce(value.socket as unknown as ReturnType<typeof io>);
}

describe("request-owned Socket.IO transport", () => {
  const initialApi = process.env.HSK_API_URL;
  beforeEach(() => {
    jest.clearAllMocks(); jest.useFakeTimers();
    process.env.HSK_API_URL = "http://localhost:3001/api/v1";
  });
  afterEach(() => {
    jest.useRealTimers();
    if (initialApi === undefined) delete process.env.HSK_API_URL; else process.env.HSK_API_URL = initialApi;
  });

  it.each([
    ["http://localhost:3001/api/v1", "http://localhost:3001/game"],
    ["https://api.tricehsk.id.vn/api/v1", "https://api.tricehsk.id.vn/game"],
    ["https://api.tricehsk.id.vn/api/v1/", "https://api.tricehsk.id.vn/game"],
  ])("derives the PK namespace from the existing REST URL %s", async (api, socketUrl) => {
    process.env.HSK_API_URL = api;
    const transport = mockSocket(); supply(transport);
    const stream = pkEventStream("one-account", 1, new AbortController().signal);
    expect(io).toHaveBeenCalledWith(socketUrl, expect.any(Object));
    await stream.cancel();
  });

  it("relays events without exposing the token and closes only the cancelled request's socket", async () => {
    const one = mockSocket(), two = mockSocket(); supply(one); supply(two);
    const controller = new AbortController();
    const stream = pkEventStream("private-access-token", 1, controller.signal);
    const other = pkEventStream("private-access-token", 1, new AbortController().signal);
    const reader = stream.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).not.toContain("private-access-token");
    expect(io).toHaveBeenCalledWith("http://localhost:3001/game", expect.objectContaining({ auth: { token: "private-access-token" }, transports: ["websocket"], forceNew: true }));
    one.emit("pk_connected", { userId: 2, hskLevel: 1, count: 3 });
    expect(new TextDecoder().decode((await reader.read()).value)).toContain("pk_connected");
    await reader.cancel();
    expect(one.socket.disconnect).toHaveBeenCalledTimes(1);
    expect(two.socket.disconnect).not.toHaveBeenCalled();
    await other.cancel();
  });

  it("sends a command without any stream or global connection from another Function", async () => {
    const command = mockSocket(); supply(command);
    const pending = sendPkCommand("another-function-session", { event: "find_match", hskLevel: 1 });
    expect(command.acknowledge).not.toHaveBeenCalled();
    command.emit("pk_connected", { userId: 2, hskLevel: 1, count: 2 });
    await expect(pending).resolves.toEqual({ ok: true });
    expect(command.acknowledge).toHaveBeenCalledWith("find_match", {});
    expect(command.socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it("keeps the event stream connected after acknowledging a command", async () => {
    const streamSocket = mockSocket(), commandSocket = mockSocket(); supply(streamSocket); supply(commandSocket);
    const stream = pkEventStream("one-account", 1, new AbortController().signal);
    const pending = sendPkCommand("one-account", { event: "submit_answer", hskLevel: 1, roomId: "room", questionId: 8, optionId: "B" });
    commandSocket.emit("pk_connected", {});
    await expect(pending).resolves.toEqual({ ok: true });
    expect(commandSocket.acknowledge).toHaveBeenCalledWith("submit_answer", { roomId: "room", questionId: 8, optionId: "B" });
    expect(streamSocket.socket.disconnect).not.toHaveBeenCalled();
    await stream.cancel();
  });

  it("preserves backend rejections and closes the command connection", async () => {
    const command = mockSocket(); supply(command);
    command.acknowledge.mockResolvedValue({ ok: false, message: "Chưa đến lượt." });
    const pending = sendPkCommand("one-account", { event: "player_ready", hskLevel: 1, roomId: "room" });
    command.emit("pk_connected", {});
    await expect(pending).resolves.toEqual({ ok: false, message: "Chưa đến lượt." });
    expect(command.socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it("carries the room to the new command socket when resuming a match", async () => {
    const command = mockSocket(); supply(command);
    const pending = sendPkCommand("one-account", { event: "find_match", hskLevel: 1, roomId: "saved-room" });
    expect(io).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ query: { hskLevel: 1, roomId: "saved-room" } }));
    command.emit("pk_connected", {});
    await expect(pending).resolves.toEqual({ ok: true });
  });

  it("rejects failed authentication and releases the socket", async () => {
    const command = mockSocket(); supply(command);
    const pending = sendPkCommand("expired-session", { event: "find_match", hskLevel: 1 });
    command.emit("disconnect", "io server disconnect");
    await expect(pending).rejects.toThrow("Kết nối PK bị gián đoạn");
    expect(command.acknowledge).not.toHaveBeenCalled();
    expect(command.socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it("times out if backend authentication never completes", async () => {
    const command = mockSocket(); supply(command);
    const pending = sendPkCommand("one-account", { event: "find_match", hskLevel: 1 });
    const rejected = expect(pending).rejects.toThrow("Máy chủ PK chưa phản hồi");
    jest.advanceTimersByTime(20000);
    await rejected;
    expect(command.socket.disconnect).toHaveBeenCalledTimes(1);
    expect(command.acknowledge).not.toHaveBeenCalled();
  });
});
