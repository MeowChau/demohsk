"use server";
import { revalidatePath } from "next/cache";
import { requireApiUser, serverApi } from "@/lib/api/server";
const unavailable = () => ({
  error:
    "Backend HSK chưa hỗ trợ lưu thẻ tự tạo. Bạn vẫn có thể học từ vựng đã xuất bản.",
});
export async function createCustomCardAction(_form: FormData) {
  return unavailable();
}
export async function updateCustomCardAction(_id: string, _form: FormData) {
  return unavailable();
}
export async function deleteCustomCardAction(_id: string) {
  return unavailable();
}
export async function toggleSaveWordAction(
  wordid: string,
  currentlySaved: boolean,
) {
  await requireApiUser();
  if (currentlySaved) return { success: true };
  const vocabularyId = Number(wordid);
  if (!Number.isSafeInteger(vocabularyId) || vocabularyId < 1)
    return { error: "Từ vựng không hợp lệ." };
  try {
    await serverApi("analytics/vocabulary-progress", {
      method: "POST",
      body: JSON.stringify({ vocabularyId, action: "studied" }),
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Chưa lưu được tiến độ.",
    };
  }
}
