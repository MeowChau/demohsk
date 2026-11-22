import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/hsk/[...path]/route";
import { backendEndpoint } from "../config";
const context = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });
describe("available HSK user endpoints", () => {
  const original = global.fetch;
  afterEach(() => { global.fetch = original; });
  it("uses the writing controller's real unversioned URL", async () => {
    expect(backendEndpoint("ai/writing-assessment")).toBe("http://localhost:3001/api/ai/writing-assessment");
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ score: 80, feedback: "Tốt", grammarErrors: [] })));
    const response = await POST(new NextRequest("http://localhost:3002/api/hsk/ai/writing-assessment", { method: "POST", headers: { origin: "http://localhost:3002", cookie: "hsk_access=access" }, body: JSON.stringify({ questionId: "1", userText: "我学习中文。", hskLevel: 1 }) }), context("ai/writing-assessment"));
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith("http://localhost:3001/api/ai/writing-assessment", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer access" }) }));
  });
  it.each(["game/offline/words", "game/offline/top-scores", "game/pk/history", "exams/3"])("reads existing %s data", async path => {
    global.fetch = jest.fn().mockResolvedValue(new Response("[]"));
    const response = await GET(new NextRequest("http://localhost:3002/api/hsk/" + path), context(path));
    expect(response.status).toBe(200);
  });
  it("preserves multipart audio rather than sending it as JSON", async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('{"score":85}'));
    const form = new FormData(); form.set("audio", new File([new Uint8Array(44)], "voice.wav", { type: "audio/wav" })); form.set("referenceText", "你好");
    const response = await POST(new NextRequest("http://localhost:3002/api/hsk/ai/speaking/pronunciation-assessment", { method: "POST", body: form, headers: { origin: "http://localhost:3002", cookie: "hsk_access=access" } }), context("ai/speaking/pronunciation-assessment"));
    expect(response.status).toBe(200);
    const [, init] = jest.mocked(global.fetch).mock.calls[0]!;
    expect(init?.body).toBeInstanceOf(FormData);
    expect(new Headers(init?.headers).has("Content-Type")).toBe(false);
    expect((init?.body as FormData).get("referenceText")).toBe("你好");
  });
  it("rejects missing pronunciation audio before contacting the provider", async () => {
    global.fetch = jest.fn();
    const form = new FormData(); form.set("referenceText", "你好");
    const response = await POST(new NextRequest("http://localhost:3002/api/hsk/ai/speaking/pronunciation-assessment", { method: "POST", body: form }), context("ai/speaking/pronunciation-assessment"));
    expect(response.status).toBe(422); expect(global.fetch).not.toHaveBeenCalled();
  });
  it("does not grant access to admin endpoints or content writes", async () => {
    global.fetch = jest.fn();
    const response = await POST(new NextRequest("http://localhost:3002/api/hsk/exams", { method: "POST", body: "{}" }), context("exams"));
    expect(response.status).toBe(404); expect(global.fetch).not.toHaveBeenCalled();
  });
});
