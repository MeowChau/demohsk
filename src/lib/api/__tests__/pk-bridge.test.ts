jest.mock("server-only", () => ({}));
jest.mock("socket.io-client", () => ({ io: jest.fn() }));
import { io } from "socket.io-client";
import { pkEventStream, sendPkCommand } from "../pk-bridge";
describe("server-side Socket.IO transport", () => {
  afterEach(() => jest.useRealTimers());
  it("keeps credentials server-side, isolates sessions and releases disconnected streams", async () => {
    jest.useFakeTimers();
    let anyListener: (event: string, payload: unknown) => void = () => {};
    const callbacks = new Map<string, (...args: unknown[]) => void>();
    const acknowledge = jest.fn().mockResolvedValue({ ok: true });
    const socket = {
      connected: false,
      on: jest.fn((event: string, callback: (...args: unknown[]) => void) => { callbacks.set(event, callback); }),
      onAny: jest.fn((callback: typeof anyListener) => { anyListener = callback; }),
      connect: jest.fn(), disconnect: jest.fn(), timeout: jest.fn(() => ({ emitWithAck: acknowledge })),
    };
    socket.connect.mockImplementation(() => { socket.connected = true; });
    socket.disconnect.mockImplementation(() => { socket.connected = false; callbacks.get("disconnect")?.(); });
    jest.mocked(io).mockReturnValue(socket as unknown as ReturnType<typeof io>);
    const controller = new AbortController();
    const stream = pkEventStream("private-access-token", 1, controller.signal);
    const reader = stream.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).not.toContain("private-access-token");
    expect(io).toHaveBeenCalledWith("http://localhost:3001/game", expect.objectContaining({ auth: { token: "private-access-token" }, transports: ["websocket"] }));
    anyListener("pk_connected", { userId: 2, hskLevel: 1, count: 3 });
    const second = await reader.read();
    expect(new TextDecoder().decode(second.value)).toContain("pk_connected");
    await expect(sendPkCommand("another-session", { event: "find_match", hskLevel: 1 })).rejects.toThrow();
    await expect(sendPkCommand("private-access-token", { event: "find_match", hskLevel: 1 })).resolves.toEqual({ ok: true });
    expect(acknowledge).toHaveBeenCalledWith("find_match", {});
    await reader.cancel();
    jest.advanceTimersByTime(3000);
    expect(socket.disconnect).toHaveBeenCalled();
    await expect(sendPkCommand("private-access-token", { event: "find_match", hskLevel: 1 })).rejects.toThrow();
  });
});
