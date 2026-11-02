export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function errorMessage(body: unknown, status: number): string {
  const value = body as {
    message?: string | string[];
    errors?: Record<string, unknown>;
  } | null;
  const codes: Record<string, string> = {
    incorrectPassword: "Mật khẩu chưa đúng.",
    incorrectEmailOrPassword: "Email hoặc mật khẩu chưa đúng.",
    notFound: "Không tìm thấy tài khoản hoặc nội dung yêu cầu.",
    emailNotVerified: "Vui lòng xác nhận email trước khi tiếp tục.",
    emailAlreadyExists: "Email này đã được sử dụng.",
    emailNotExists: "Email chưa được đăng ký.",
  };
  const errors = Object.values(value?.errors || {}).flatMap((error) =>
    typeof error === "string" ? [codes[error] || error] : [],
  );
  if (errors.length) return errors.join(" · ");
  if (Array.isArray(value?.message)) return value.message.join(" · ");
  return (
    value?.message ||
    (status === 401
      ? "Phiên đăng nhập đã hết hạn."
      : "Không kết nối được máy chủ HSK.")
  );
}
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (typeof init.body === "string")
    headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/hsk/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  const data: unknown =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(errorMessage(data, response.status), response.status);
  return data as T;
}
export async function apiAction<T>(
  path: string,
  body?: unknown,
  method = "POST",
) {
  return apiFetch<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
