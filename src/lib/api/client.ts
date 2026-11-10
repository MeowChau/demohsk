export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors: Record<string, string> = {},
    public code?: string,
  ) {
    super(message);
  }
}

const FIELD_LABELS: Record<string, string> = {
  username: "Tên người dùng", email: "Email", password: "Mật khẩu", oldPassword: "Mật khẩu hiện tại",
  confirmPassword: "Xác nhận mật khẩu", firstName: "Tên", currentHskLevel: "Cấp độ HSK hiện tại",
  targetHskLevel: "Cấp độ HSK mục tiêu", hskLevel: "Cấp độ HSK", dailyStudyTime: "Số phút học mỗi ngày", questionId: "Câu hỏi",
  userText: "Bài viết", referenceText: "Nội dung cần đọc", audio: "Bản ghi âm", file: "Tệp", photo: "Ảnh đại diện", search: "Từ tìm kiếm",
};
function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function messages(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(messages);
  return Object.values(record(value) || {}).flatMap(messages);
}
function validationMessage(field: string, message: string): string {
  const label = FIELD_LABELS[field];
  if (!label) return message;
  if (/mustBeNotEmpty|should not be empty|must not be empty/.test(message)) return `Vui lòng nhập ${label.toLowerCase()}.`;
  if (/must be an email/.test(message)) return "Nhập địa chỉ email hợp lệ.";
  if (/must be an integer/.test(message)) return `${label} phải là số nguyên.`;
  let match = message.match(/must be shorter than or equal to (\d+) characters/);
  if (match) return `${label} tối đa ${match[1]} ký tự.`;
  match = message.match(/must be longer than or equal to (\d+) characters/);
  if (match) return `${label} cần ít nhất ${match[1]} ký tự.`;
  match = message.match(/must not be greater than (\d+)/);
  if (match) return `${label} không được lớn hơn ${match[1]}.`;
  match = message.match(/must not be less than (\d+)/);
  if (match) return `${label} cần từ ${match[1]} trở lên.`;
  if (/must be a (string|number)/.test(message)) return `${label} chưa hợp lệ.`;
  return message;
}

export function backendFieldErrors(body: unknown): Record<string, string> {
  const errors = record(record(body)?.errors);
  if (!errors) return {};
  return Object.fromEntries(Object.entries(errors).filter(([field, value]) => Object.hasOwn(FIELD_LABELS, field) && messages(value).length > 0)
    .map(([field, value]) => [field, errorMessage({ errors: { [field]: value } }, 422)]));
}
export function errorMessage(body: unknown, status: number): string {
  const value = body as {
    message?: string | string[];
    errors?: Record<string, unknown>;
  } | null;
  const codes: Record<string, string> = {
    "Writing assessment is not configured": "Chức năng chấm bài viết chưa được cấu hình. Vui lòng thử lại sau.",
    "Pronunciation assessment is not configured": "Chức năng chấm phát âm chưa được cấu hình. Vui lòng thử lại sau.",
    "Failed to process writing assessment": "Chưa chấm được bài viết. Vui lòng thử lại sau.",
    accountNotActive: "Tài khoản chưa được kích hoạt hoặc đang chờ duyệt. Vui lòng liên hệ quản trị viên.",
    wrongToken: "Thông tin đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
    incorrectOldPassword: "Mật khẩu hiện tại chưa đúng.",
    missingOldPassword: "Nhập mật khẩu hiện tại để xác nhận.",
    emailExists: "Email này đã được sử dụng.",
    selectFile: "Vui lòng chọn tệp.",
    cantUploadFileType: "Định dạng tệp không được hỗ trợ.",
    fileNotExists: "Không tìm thấy tệp đã tải lên. Vui lòng chọn lại.",
    "Internal server error": "Máy chủ đang gặp lỗi. Vui lòng thử lại sau.",
    invalidHash: "Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại.",
    usernameAlreadyExists: "Tên người dùng này đã được sử dụng.",
    userNotFound: "Không tìm thấy tài khoản.",
    incorrectPassword: "Mật khẩu chưa đúng.",
    incorrectEmailOrPassword: "Email hoặc mật khẩu chưa đúng.",
    notFound: "Không tìm thấy tài khoản hoặc nội dung yêu cầu.",
    emailNotVerified: "Vui lòng xác nhận email trước khi tiếp tục.",
    emailAlreadyExists: "Email này đã được sử dụng.",
    emailNotExists: "Email chưa được đăng ký.",
  };
  const translate = (field: string, message: string) => validationMessage(field, codes[message] || message);
  const errors = Object.entries(record(value?.errors) || {}).flatMap(([field, error]) => messages(error).map(message => translate(field, message)));
  if (errors.length) return errors.join(" · ");
  if (Array.isArray(value?.message)) {
    const message = messages(value.message).map(message => translate(message.split(" ")[0] || "", message)).join(" · ");
    if (message) return message;
  }
  return (
    (typeof value?.message === "string" ? codes[value.message] || value.message : undefined) ||
    (status === 401
      ? "Phiên đăng nhập đã hết hạn."
      : status === 429 ? "Bạn thao tác quá nhanh. Vui lòng chờ một lát rồi thử lại."
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
  let response: Response;
  try {
    response = await fetch(`/api/hsk/${path.replace(/^\/+/, "")}`, {
      ...init, headers, credentials: "same-origin", cache: "no-store",
    });
  } catch {
    throw new ApiError("Không kết nối được máy chủ HSK. Vui lòng kiểm tra kết nối và thử lại.", 503);
  }
  const data: unknown =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(errorMessage(data, response.status), response.status, backendFieldErrors(data), typeof record(data)?.code === "string" ? record(data)!.code as string : undefined);
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
