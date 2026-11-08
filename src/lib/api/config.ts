export const ACCESS_COOKIE = "hsk_access";
export const REFRESH_COOKIE = "hsk_refresh";
export const backendUrl = () =>
  (process.env.HSK_API_URL || "https://api.tricehsk.id.vn/api/v1").replace(
    /\/$/,
    "",
  );
export const adminUrl = () =>
  process.env.HSK_ADMIN_URL || "https://admin.tricehsk.id.vn/";
export function backendEndpoint(path: string) {
  const base = path === "ai/writing-assessment" ? backendUrl().replace(/\/v\d+$/, "") : backendUrl();
  return `${base}/${path.replace(/^\/+/, "")}`;
}
export function apiRole(user: {
  role?: { id: number };
}): "student" | "teacher" | "admin" {
  return Number(user.role?.id) === 1
    ? "admin"
    : Number(user.role?.id) === 3
      ? "teacher"
      : "student";
}
export function publicMedia(value?: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (!/^\/(?!\/)/.test(value)) return null;
  return `${(process.env.NEXT_PUBLIC_HSK_MEDIA_ORIGIN || "https://api.tricehsk.id.vn/api/v1").replace(/\/$/, "")}${value}`;
}
