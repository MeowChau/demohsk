import { ApiError, apiAction, apiFetch, backendFieldErrors, errorMessage } from "../client";

describe("backend validation feedback", () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it("associates duplicate registration values with their inputs", async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ status: 422, errors: { username: "usernameAlreadyExists", email: "emailAlreadyExists" } }), { status: 422 }));
    await expect(apiAction("auth/email/register", {})).rejects.toMatchObject({
      status: 422,
      fieldErrors: { username: "Tên người dùng này đã được sử dụng.", email: "Email này đã được sử dụng." },
    });
  });

  it("translates the nested NestJS validation tree into readable field errors", () => {
    expect(backendFieldErrors({ errors: {
      password: { minLength: "password must be longer than or equal to 6 characters" },
      dailyStudyTime: ["dailyStudyTime must be an integer number"],
      targetHskLevel: "targetHskLevel must not be greater than 9",
      firstName: "firstName must be shorter than or equal to 255 characters",
    } })).toEqual({
      password: "Mật khẩu cần ít nhất 6 ký tự.",
      dailyStudyTime: "Số phút học mỗi ngày phải là số nguyên.",
      targetHskLevel: "Cấp độ HSK mục tiêu không được lớn hơn 9.",
      firstName: "Tên tối đa 255 ký tự.",
    });
  });

  it("keeps incorrect current-password feedback on oldPassword", () => {
    expect(backendFieldErrors({ errors: { oldPassword: "incorrectOldPassword" } })).toEqual({ oldPassword: "Mật khẩu hiện tại chưa đúng." });
  });

  it("ignores empty or unknown field errors while preserving useful global feedback", () => {
    expect(backendFieldErrors({ errors: { email: null, password: false, firstName: "", unexpected: "notAllowed" } })).toEqual({});
    expect(errorMessage({ errors: { unexpected: "notAllowed" } }, 422)).toBe("notAllowed");
  });

  it.each([null, {}, { errors: [] }, { message: [] }])("handles malformed error responses %j", body => {
    expect(backendFieldErrors(body)).toEqual({});
    expect(errorMessage(body, 429)).toBe("Bạn thao tác quá nhanh. Vui lòng chờ một lát rồi thử lại.");
  });

  it("gives a useful connection error without inventing field errors", async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiFetch("auth/me")).rejects.toMatchObject({ status: 503, fieldErrors: {}, message: expect.stringContaining("kiểm tra kết nối") });
  });

  it("retains compatibility with existing two-argument ApiError callers", () => {
    expect(new ApiError("Unavailable", 503).fieldErrors).toEqual({});
  });
});
