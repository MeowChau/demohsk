"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireApiUser, serverApi } from "@/lib/api/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, publicMedia } from "@/lib/api/config";
import {
  profileInfoSchema,
  changePasswordSchema,
} from "@/lib/validations/profile";

export async function updateProfileInfoAction(form: FormData) {
  await requireApiUser();
  const parsed = profileInfoSchema
    .omit({ currentBand: true, targetBand: true })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message || "Invalid profile." };
  const current = String(form.get("currentBand") || "");
  const target = String(form.get("targetBand") || "");
  if (
    [current, target].some(
      (value) =>
        value &&
        (!Number.isInteger(Number(value)) ||
          Number(value) < 1 ||
          Number(value) > 9),
    )
  )
    return { error: "Cấp độ HSK phải là số nguyên từ 1 đến 9." };
  try {
    await serverApi("auth/me", {
      method: "PATCH",
      body: JSON.stringify({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
      }),
    });
    if (current || target)
      await serverApi("users/me/study-goals", {
        method: "PATCH",
        body: JSON.stringify({
          ...(current ? { currentHskLevel: Number(current) } : {}),
          ...(target ? { targetHskLevel: Number(target) } : {}),
        }),
      });
    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không lưu được hồ sơ.",
    };
  }
}
export async function uploadAvatarAction(form: FormData) {
  await requireApiUser();
  const file = form.get("avatar");
  if (!(file instanceof File) || !file.size)
    return { error: "No file provided" };
  if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024)
    return { error: "Chọn ảnh nhỏ hơn 3MB." };
  try {
    const payload = new FormData();
    payload.set("file", file);
    const uploaded = await serverApi<{ file: { id: string; path: string } }>(
      "files/upload",
      { method: "POST", body: payload },
    );
    await serverApi("auth/me", {
      method: "PATCH",
      body: JSON.stringify({ photo: { id: uploaded.file.id } }),
    });
    revalidatePath("/profile");
    revalidatePath("/");
    return {
      success: true,
      avatarUrl: publicMedia(uploaded.file.path) || undefined,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không tải ảnh được.",
    };
  }
}
export async function updateSettingsAction(_form: FormData) {
  return { error: "Backend HSK chưa hỗ trợ lưu các tùy chọn thông báo này." };
}
export async function changePasswordAction(form: FormData) {
  await requireApiUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const oldPassword = String(form.get("oldPassword") || "");
  if (!oldPassword) return { error: "Nhập mật khẩu hiện tại để xác nhận." };
  try {
    await serverApi("auth/me", {
      method: "PATCH",
      body: JSON.stringify({ oldPassword, password: parsed.data.password }),
    });
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Không đổi được mật khẩu.",
    };
  }
}
export async function deleteAccountAction() {
  await requireApiUser();
  try {
    await serverApi("auth/me", { method: "DELETE" });
    const store = await cookies();
    store.delete(ACCESS_COOKIE);
    store.delete(REFRESH_COOKIE);
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Không xóa được tài khoản.",
    };
  }
}
