import { z } from "zod";

// This legacy form has no backend endpoint yet; preserve only its required fields.
export const supportTicketSchema = z.object({
  subject: z.string({ required_error: "Nhập tiêu đề yêu cầu." }).trim().min(1, "Nhập tiêu đề yêu cầu."),
  message: z.string({ required_error: "Nhập nội dung cần hỗ trợ." }).trim().min(1, "Nhập nội dung cần hỗ trợ."),
});
