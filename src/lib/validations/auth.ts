import { z } from "zod";

const email = z.string({ required_error: "Nhập địa chỉ email" }).trim().toLowerCase().min(1, "Nhập địa chỉ email").email("Nhập địa chỉ email hợp lệ").max(255, "Email tối đa 255 ký tự");
const password = z.string({ required_error: "Nhập mật khẩu" }).min(1, "Nhập mật khẩu").min(6, "Mật khẩu cần ít nhất 6 ký tự").max(72, "Mật khẩu tối đa 72 ký tự");

export const signupSchema = z.object({
  username: z.string({ required_error: "Nhập tên người dùng" }).trim().min(1, "Nhập tên người dùng").max(255, "Tên người dùng tối đa 255 ký tự"),
  email,
  password,
  confirmPassword: z.string({ required_error: "Nhập lại mật khẩu" }).min(1, "Nhập lại mật khẩu").max(72, "Mật khẩu tối đa 72 ký tự"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận chưa khớp",
  path: ["confirmPassword"],
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email,
  password: z.string({ required_error: "Nhập mật khẩu" }).min(1, "Nhập mật khẩu").max(72, "Mật khẩu tối đa 72 ký tự"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string({ required_error: "Nhập lại mật khẩu" }).min(1, "Nhập lại mật khẩu").max(72, "Mật khẩu tối đa 72 ký tự"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận chưa khớp",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
