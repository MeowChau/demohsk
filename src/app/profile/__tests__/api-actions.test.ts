jest.mock("@/lib/api/server", () => ({ requireApiUser: jest.fn(), serverApi: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/headers", () => ({ cookies: jest.fn() }));

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireApiUser, serverApi } from "@/lib/api/server";
import type { HskUser } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import { updateProfileInfoAction, changePasswordAction, uploadAvatarAction, deleteAccountAction } from "../api-actions";

const request = jest.mocked(serverApi);
const user: HskUser = { id: 2, email: "learner@example.test", username: "learner", firstName: "An", lastName: "Nguyen", level: 1, currentExp: 0, role: { id: 2 }, currentHskLevel: 3, targetHskLevel: 6, dailyStudyTime: 30 };
const removeCookie = jest.fn();
function form(values: Record<string, string | undefined>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) if (value !== undefined) data.set(key, value);
  return data;
}

beforeEach(() => {
  jest.clearAllMocks();
  request.mockReset().mockImplementation(async (path, init) => {
    if (path === "auth/me") return { ...user, ...JSON.parse(typeof init?.body === "string" ? init.body : "{}") };
    return {};
  });
  jest.mocked(requireApiUser).mockResolvedValue(user);
  jest.mocked(cookies).mockResolvedValue({ delete: removeCookie } as unknown as Awaited<ReturnType<typeof cookies>>);
});

describe("profile request contracts", () => {
  it("ignores removed name fields and sends only study goals", async () => {
    expect(await updateProfileInfoAction(form({ firstName: "Lan", lastName: "", fullName: "ignored", dailyStudyTime: "60" }))).toEqual({ success: true });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("users/me/study-goals", { method: "PATCH", body: JSON.stringify({ dailyStudyTime: 60 }) });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("sends HSK levels and daily minutes as numbers to the study-goals endpoint", async () => {
    expect(await updateProfileInfoAction(form({ firstName: "An", currentHskLevel: "4", targetHskLevel: "9", dailyStudyTime: "45" }))).toEqual({ success: true });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("users/me/study-goals", { method: "PATCH", body: JSON.stringify({ currentHskLevel: 4, targetHskLevel: 9, dailyStudyTime: 45 }) });
  });

  it("does not send unsupported username changes to the existing backend", async () => {
    expect(await updateProfileInfoAction(form({ username: "new_username", firstName: "Lan" }))).toMatchObject({ fieldErrors: { username: expect.stringContaining("không thể thay đổi") } });
    expect(request).not.toHaveBeenCalled();
  });

  it("does not write account data when an old form submits only removed name fields", async () => {
    expect(await updateProfileInfoAction(form({ username: "learner", firstName: "Lan" }))).toEqual({ success: true });
    expect(request).not.toHaveBeenCalled();
  });

  it("allows a new user to save goals without inventing a name from the username", async () => {
    jest.mocked(requireApiUser).mockResolvedValue({ ...user, firstName: null });
    expect(await updateProfileInfoAction(form({ firstName: "", dailyStudyTime: "60" }))).toEqual({ success: true });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toBe("users/me/study-goals");
  });

  it("does not send blank goals or unchanged values", async () => {
    expect(await updateProfileInfoAction(form({ firstName: "An", currentHskLevel: "3", targetHskLevel: "", dailyStudyTime: "30" }))).toEqual({ success: true });
    expect(request).not.toHaveBeenCalled();
  });

  it.each([{ currentHskLevel: "3.5" }, { targetHskLevel: "10" }, { dailyStudyTime: "1441" }, { username: " " }, { username: "x".repeat(256) }])("rejects invalid profile input before writing %o", async values => {
    expect(await updateProfileInfoAction(form(values))).toHaveProperty("error");
    expect(request).not.toHaveBeenCalled();
  });

  it("does not report success or write account data when saving study goals fails", async () => {
    request.mockRejectedValueOnce(new Error("Backend unavailable"));
    const result = await updateProfileInfoAction(form({ firstName: "Lan", dailyStudyTime: "60" }));
    expect(result.error).toBe("Backend unavailable");
    expect(result).not.toHaveProperty("success");
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toBe("users/me/study-goals");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("uses oldPassword and password, with the six-character backend minimum", async () => {
    expect(await changePasswordAction(form({ oldPassword: "old-password", password: "abc123", confirmPassword: "abc123" }))).toEqual({ success: true });
    expect(request).toHaveBeenCalledWith("auth/me", { method: "PATCH", body: JSON.stringify({ oldPassword: "old-password", password: "abc123" }) });
  });

  it("does not send a password change without the current password", async () => {
    expect(await changePasswordAction(form({ password: "abc123", confirmPassword: "abc123" }))).toHaveProperty("error");
    expect(request).not.toHaveBeenCalled();
  });

  it("returns profile validation errors under the matching input names without writing", async () => {
    expect(await updateProfileInfoAction(form({ dailyStudyTime: "1.5" }))).toMatchObject({ fieldErrors: { dailyStudyTime: expect.stringContaining("số nguyên") } });
    expect(request).not.toHaveBeenCalled();
  });

  it("returns confirmation mismatch inline without calling the backend", async () => {
    expect(await changePasswordAction(form({ oldPassword: "old", password: "abc123", confirmPassword: "abc124" }))).toMatchObject({ fieldErrors: { confirmPassword: "Mật khẩu xác nhận chưa khớp" } });
    expect(request).not.toHaveBeenCalled();
  });

  it("preserves backend field errors in the password action response", async () => {
    request.mockRejectedValueOnce(new ApiError("Mật khẩu hiện tại chưa đúng.", 422, { oldPassword: "Mật khẩu hiện tại chưa đúng." }));
    expect(await changePasswordAction(form({ oldPassword: "old", password: "abc123", confirmPassword: "abc123" }))).toMatchObject({ fieldErrors: { oldPassword: "Mật khẩu hiện tại chưa đúng." } });
  });

  it("rejects unsupported avatar extensions before upload", async () => {
    const data = new FormData(); data.set("avatar", new File(["image"], "avatar.svg", { type: "image/svg+xml" }));
    expect(await uploadAvatarAction(data)).toHaveProperty("error");
    expect(request).not.toHaveBeenCalled();
  });

  it("uploads multipart file then saves the returned photo ID", async () => {
    request.mockResolvedValueOnce({ file: { id: "photo-id", path: "/api/v1/files/avatar.png" } }).mockResolvedValueOnce({});
    const data = new FormData(); data.set("avatar", new File(["image"], "avatar.png", { type: "image/png" }));
    expect(await uploadAvatarAction(data)).toEqual({ success: true, avatarUrl: "http://localhost:3001/api/v1/files/avatar.png" });
    const [uploadPath, init] = request.mock.calls[0]!;
    expect(uploadPath).toBe("files/upload");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("file")).toBeInstanceOf(File);
    expect(request.mock.calls[1]).toEqual(["auth/me", { method: "PATCH", body: JSON.stringify({ photo: { id: "photo-id" } }) }]);
  });

  it("clears session cookies only after account deletion succeeds", async () => {
    request.mockRejectedValueOnce(new Error("Backend unavailable"));
    expect(await deleteAccountAction()).toHaveProperty("error");
    expect(removeCookie).not.toHaveBeenCalled();
    expect(await deleteAccountAction()).toEqual({ success: true });
    expect(request).toHaveBeenLastCalledWith("auth/me", { method: "DELETE" });
    expect(removeCookie.mock.calls).toEqual([["hsk_access"], ["hsk_refresh"]]);
  });
});
