import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/hsk/[...path]/route";
import { apiRole, publicMedia } from "../config";
import { errorMessage } from "../client";
const ctx = (path: string) => ({
  params: Promise.resolve({ path: path.split("/") }),
});
describe("Existing HSK backend integration", () => {
  const original = global.fetch;
  afterEach(() => {
    global.fetch = original;
    jest.useRealTimers();
  });
  it("uses backend roles rather than the role selected in the form", () => {
    expect(apiRole({ role: { id: 1 } })).toBe("admin");
    expect(apiRole({ role: { id: 2 } })).toBe("student");
    expect(apiRole({ role: { id: 3 } })).toBe("teacher");
  });
  it("resolves HSK media without duplicating the API prefix", () => {
    expect(publicMedia("/api/v1/files/a.mp3")).toBe(
      "http://localhost:3001/api/v1/files/a.mp3",
    );
    expect(publicMedia("//example.com/a")).toBeNull();
  });
  it("explains backend auth errors", () => {
    expect(
      errorMessage({ errors: { password: "incorrectPassword" } }, 422),
    ).toBe("Mật khẩu chưa đúng.");
  });
  it("keeps JWTs in HttpOnly cookies and exposes only the user", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            token: "access",
            refreshToken: "refresh",
            tokenExpires: 123,
            user: { id: 2 },
          }),
        ),
      );
    const response = await POST(
      new NextRequest("http://localhost:3000/api/hsk/auth/email/login", {
        method: "POST",
        body: "{}",
        headers: { origin: "http://localhost:3000" },
      }),
      ctx("auth/email/login"),
    );
    expect(await response.json()).toEqual({ user: { id: 2 } });
    expect(response.cookies.get("hsk_access")?.value).toBe("access");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });
  it.each([
    "admin/users",
    "questions",
    "exams/1/editor",
    "practice-sets/1/editor",
  ])("blocks the admin endpoint %s", async (path) => {
    const mocked = jest.fn();
    global.fetch = mocked;
    const response = await GET(
      new NextRequest("http://localhost:3000/api/hsk/" + path),
      ctx(path),
    );
    expect(response.status).toBe(404);
    expect(mocked).not.toHaveBeenCalled();
  });
  it("rejects mutations sent from a different origin", async () => {
    global.fetch = jest.fn();
    const response = await POST(
      new NextRequest("http://localhost:3000/api/hsk/auth/logout", {
        method: "POST",
        headers: { origin: "https://other.example.com" },
      }),
      ctx("auth/logout"),
    );
    expect(response.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it("refreshes an expired access token and retries once", async () => {
    jest.useFakeTimers();
    const mocked = jest
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "new", refreshToken: "rotated" })),
      )
      .mockResolvedValueOnce(new Response('{"id":2}'));
    global.fetch = mocked;
    const response = await GET(
      new NextRequest("http://localhost:3000/api/hsk/auth/me", {
        headers: { cookie: "hsk_access=old; hsk_refresh=test-refresh" },
      }),
      ctx("auth/me"),
    );
    expect(await response.json()).toEqual({ id: 2 });
    expect(mocked).toHaveBeenCalledTimes(3);
    expect(response.cookies.get("hsk_access")?.value).toBe("new");
    jest.runOnlyPendingTimers();
  });
  it("clears the local session on logout even when the backend is unavailable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline"));
    const response = await POST(
      new NextRequest("http://localhost:3000/api/hsk/auth/logout", {
        method: "POST",
      }),
      ctx("auth/logout"),
    );
    expect(response.status).toBe(503);
    expect(response.cookies.get("hsk_access")?.value).toBe("");
  });
  it("supports the backend's empty registration response", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const response = await POST(
      new NextRequest("http://localhost:3000/api/hsk/auth/email/register", {
        method: "POST",
        body: "{}",
      }),
      ctx("auth/email/register"),
    );
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});
