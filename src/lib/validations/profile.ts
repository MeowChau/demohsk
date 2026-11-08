import { z } from "zod";

const optionalIntegerInput = (max: number, message: string) => z.string().trim().optional()
  .refine(value => !value || (Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= max), message)
  .transform(value => value ? Number(value) : undefined);

export const profileInfoSchema = z.object({
  currentHskLevel: optionalIntegerInput(9, "Cấp độ HSK hiện tại phải là số nguyên từ 1 đến 9."),
  targetHskLevel: optionalIntegerInput(9, "Cấp độ HSK mục tiêu phải là số nguyên từ 1 đến 9."),
  dailyStudyTime: optionalIntegerInput(1440, "Mục tiêu mỗi ngày cần là số nguyên từ 1 đến 1440 phút."),
});
export type ProfileInfoInput = z.infer<typeof profileInfoSchema>;

export const settingsSchema = z.object({
  emailNotifications: z.boolean(),
  streakReminders: z.boolean(),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

export const changePasswordSchema = z
  .object({
    oldPassword: z.string({ required_error: "Nhập mật khẩu hiện tại để xác nhận." }).min(1, "Nhập mật khẩu hiện tại để xác nhận.").max(72, "Mật khẩu hiện tại tối đa 72 ký tự"),
    password: z.string({ required_error: "Nhập mật khẩu mới" }).min(1, "Nhập mật khẩu mới").min(6, "Mật khẩu cần ít nhất 6 ký tự").max(72, "Mật khẩu tối đa 72 ký tự"),
    confirmPassword: z.string({ required_error: "Nhập lại mật khẩu mới" }).min(1, "Nhập lại mật khẩu mới").max(72, "Mật khẩu tối đa 72 ký tự"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận chưa khớp",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
