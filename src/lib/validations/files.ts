export const AVATAR_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif";
export const AUDIO_ACCEPT = ".mp3,.wav,.m4a,.ogg,.aac,.flac,.webm";
type UploadFile = Pick<File, "name" | "size" | "type">;

export function avatarFileError(file?: UploadFile | null): string | null {
  if (!file || !file.size) return "Vui lòng chọn tệp ảnh.";
  if (file.size > 3 * 1024 * 1024) return "Ảnh đại diện tối đa 3 MB.";
  if (!/\.(jpe?g|png|webp|gif)$/i.test(file.name) || (file.type && !file.type.startsWith("image/")))
    return "Chọn ảnh JPG, PNG, WebP hoặc GIF.";
  return null;
}

export function audioFileError(file?: UploadFile | null): string | null {
  if (!file || !file.size) return "Vui lòng ghi âm hoặc chọn tệp âm thanh.";
  if (file.size > 10 * 1024 * 1024) return "Tệp âm thanh tối đa 10 MB.";
  if (!/\.(mp3|wav|m4a|ogg|aac|flac|webm)$/i.test(file.name)) return "Chọn tệp MP3, WAV, M4A, OGG, AAC, FLAC hoặc WebM.";
  return null;
}
