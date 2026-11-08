jest.mock("server-only", () => ({}));
jest.mock("@/lib/api/server", () => ({ getApiUser: jest.fn() }));
jest.mock("@/lib/api/pk-bridge", () => ({ pkEventStream: jest.fn(), sendPkCommand: jest.fn() }));
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/pk/route";
import { getApiUser } from "../server";
import { sendPkCommand, pkEventStream } from "../pk-bridge";
describe("HttpOnly PK bridge authentication", () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it("requires a student identity before opening a stream", async () => {
    jest.mocked(getApiUser).mockResolvedValue(null);
    const response = await GET(new NextRequest("http://localhost:3002/api/pk?hskLevel=1"));
    expect(response.status).toBe(401); expect(pkEventStream).not.toHaveBeenCalled();
  });
  it("rejects commands sent from the separate admin origin", async () => {
    const response = await POST(new NextRequest("http://localhost:3002/api/pk", { method: "POST", headers: { origin: "http://localhost:3000" }, body: "{}" }));
    expect(response.status).toBe(403); expect(sendPkCommand).not.toHaveBeenCalled();
  });
  it("keeps identity and score fields out of client commands", async () => {
    jest.mocked(getApiUser).mockResolvedValue({ id: 2, username: "learner", email: null, role: { id: 2 }, level: 1, currentExp: 0 });
    jest.mocked(sendPkCommand).mockResolvedValue({ ok: true });
    const response = await POST(new NextRequest("http://localhost:3002/api/pk", { method: "POST", headers: { origin: "http://localhost:3002", cookie: "hsk_access=private" }, body: JSON.stringify({ event: "find_match", hskLevel: 1, userId: 999, score: 999 }) }));
    expect(response.status).toBe(200);
    expect(sendPkCommand).toHaveBeenCalledWith("private", { event: "find_match", hskLevel: 1 });
    expect(await response.text()).not.toContain("private");
  });
  it("reports a backend outage without turning it into a false login failure", async () => {
    jest.mocked(getApiUser).mockRejectedValue(new Error("offline"));
    expect((await GET(new NextRequest("http://localhost:3002/api/pk?hskLevel=1"))).status).toBe(503);
  });
});
