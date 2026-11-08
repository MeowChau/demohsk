import { z } from "zod";

export const submitAnswersSchema = z.object({
  attemptid: z.string().uuid(),
  testid: z.string().uuid(),
  answers: z.record(z.string(), z.string()),
});
export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>;

export const writingAssessmentSchema = z.object({
  questionId: z.string({ required_error: "Chọn câu hỏi luyện viết." }).trim().min(1, "Chọn câu hỏi luyện viết.").max(100, "Mã câu hỏi tối đa 100 ký tự."),
  userText: z.string({ required_error: "Nhập bài viết bằng tiếng Trung." }).trim().min(1, "Nhập bài viết bằng tiếng Trung.").max(10000, "Bài viết tối đa 10.000 ký tự."),
  hskLevel: z.coerce.number().int("Cấp độ HSK phải là số nguyên.").min(1, "Cấp độ HSK từ 1 đến 9.").max(9, "Cấp độ HSK từ 1 đến 9."),
});

export const pronunciationAssessmentSchema = z.object({
  referenceText: z.string({ required_error: "Nhập nội dung cần đọc." }).trim().min(1, "Nhập nội dung cần đọc.").max(5000, "Nội dung cần đọc tối đa 5.000 ký tự."),
});
