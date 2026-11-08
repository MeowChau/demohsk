"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireApiUser, serverApi } from "@/lib/api/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, publicMedia } from "@/lib/api/config";
import {
  profileInfoSchema,
  changePasswordSchema,
} from "@/lib/validations/profile";
import { errorFields, issuesToFieldErrors } from "@/lib/validations/form-errors";
import { avatarFileError } from "@/lib/validations/files";

function refreshProfilePages() {
  revalidatePath("/", "layout");
}

export async function updateProfileInfoAction(form: FormData) {
  const user = await requireApiUser();
  const submittedUsername = form.get("username");
  if (submittedUsername !== null && (typeof submittedUsername !== "string" || submittedUsername.trim() !== user.username))
    return { error: "Tên người dùng do quản trị viên quản lý. Mục này chỉ lưu mục tiêu học tập.", fieldErrors: { username: "Tên người dùng không thể thay đổi qua API hồ sơ hiện tại." } };
  const parsed = profileInfoSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: "Vui lòng kiểm tra các ô nhập trong hồ sơ.", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  const { currentHskLevel, targetHskLevel, dailyStudyTime } = parsed.data;
  const goals = {
    ...(currentHskLevel !== undefined && currentHskLevel !== user.currentHskLevel ? { currentHskLevel } : {}),
    ...(targetHskLevel !== undefined && targetHskLevel !== user.targetHskLevel ? { targetHskLevel } : {}),
    ...(dailyStudyTime !== undefined && dailyStudyTime !== user.dailyStudyTime ? { dailyStudyTime } : {}),
  };
  try {
    if (Object.keys(goals).length)
      await serverApi("users/me/study-goals", {
        method: "PATCH",
        body: JSON.stringify(goals),
      });
    refreshProfilePages();
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không lưu được mục tiêu học.";
    return { error: message, fieldErrors: errorFields(error) };
  }
}
export async function uploadAvatarAction(form: FormData) {
  await requireApiUser();
  const file = form.get("avatar");
  if (!(file instanceof File)) return { error: "Vui lòng chọn tệp ảnh." };
  const fileError = avatarFileError(file);
  if (fileError) return { error: fileError };
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
    refreshProfilePages();
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
  if (!parsed.success) return { error: "Vui lòng kiểm tra thông tin mật khẩu.", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  try {
    await serverApi("auth/me", {
      method: "PATCH",
      body: JSON.stringify({ oldPassword: parsed.data.oldPassword, password: parsed.data.password }),
    });
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Không đổi được mật khẩu.",
      fieldErrors: errorFields(error),
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
