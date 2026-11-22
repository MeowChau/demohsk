import { renderToStaticMarkup } from "react-dom/server";
import { Field } from "@/components/ui/field";
import { loginSchema, signupSchema } from "../auth";
import { errorFields, issuesToFieldErrors } from "../form-errors";
import { avatarFileError, audioFileError } from "../files";
import { writingAssessmentSchema, pronunciationAssessmentSchema } from "../assessment";

it("shows the first Vietnamese error on each invalid field", () => {
  const result = signupSchema.safeParse({ username: " ", email: "bad", password: "", confirmPassword: "" });
  if (result.success) throw new Error("Expected invalid form");
  expect(issuesToFieldErrors(result.error.issues)).toEqual({
    username: "Nhập tên người dùng", email: "Nhập địa chỉ email hợp lệ", password: "Nhập mật khẩu", confirmPassword: "Nhập lại mật khẩu",
  });
});

it("reads the actual form values and normalizes only the email, preserving password spaces", () => {
  const form = new FormData(); form.set("email", " LEARNER@EXAMPLE.COM "); form.set("password", "  abc123  ");
  expect(loginSchema.parse(Object.fromEntries(form))).toEqual({ email: "learner@example.com", password: "  abc123  " });
  expect(loginSchema.safeParse({ email: "a@b.com", password: "x".repeat(73) }).success).toBe(false);
});

it("uses Vietnamese required errors for missing fields", () => {
  const result = signupSchema.safeParse({});
  if (result.success) throw new Error("Expected missing fields");
  expect(Object.values(issuesToFieldErrors(result.error.issues))).toEqual(["Nhập tên người dùng", "Nhập địa chỉ email", "Nhập mật khẩu", "Nhập lại mật khẩu"]);
});

it("renders accessible inline errors and leaves password adornments in the input wrapper", () => {
  const html = renderToStaticMarkup(<Field id="password" name="password" label="Mật khẩu" type="password" required hint="6–72 ký tự" error="Nhập mật khẩu" aria-describedby="help" endAdornment={<button type="button">Hiện</button>} />);
  expect(html).toContain('aria-invalid="true"');
  expect(html).toContain('aria-describedby="help password-error"');
  expect(html).toContain('id="password-error"');
  expect(html).toContain('role="alert"');
  expect(html).toContain("border-danger");
  expect(html).toMatch(/aria-hidden="true"> \*<\/span>/);
  expect(html).toMatch(/class="relative"><input[\s\S]*?absolute inset-y-0 right-3 flex items-center/);
  expect(html).not.toContain('id="password-hint"');
});

it("renders optional field hints without marking the input required", () => {
  const html = renderToStaticMarkup(<Field id="dailyStudyTime" name="dailyStudyTime" type="number" label="Phút học mỗi ngày" hint="Từ 1 đến 1440 phút." />);
  expect(html).toContain('aria-describedby="dailyStudyTime-hint"');
  expect(html).not.toContain("required");
  expect(html).not.toContain('role="alert"');
});

it("accepts only string messages from errors returned by actions", () => {
  expect(errorFields({ fieldErrors: { email: "Email bị trùng", password: null } })).toEqual({ email: "Email bị trùng" });
  expect(errorFields(new Error("Unavailable"))).toEqual({});
});

describe("upload validation before processing", () => {
  const image = { name: "avatar.PNG", type: "image/png", size: 3 * 1024 * 1024 };
  it("accepts the supported image format at the exact size limit", () => expect(avatarFileError(image)).toBeNull());
  it.each([undefined, { ...image, size: 0 }, { ...image, size: image.size + 1 }, { ...image, name: "image.svg" }, { ...image, type: "application/pdf" }])("rejects unusable or unsupported avatars %j", file => expect(avatarFileError(file)).toBeTruthy());
  it("accepts audio at the exact limit even when the browser does not provide a MIME type", () => expect(audioFileError({ name: "recording.WAV", size: 10 * 1024 * 1024, type: "" })).toBeNull());
  it.each([undefined, { name: "recording.mp3", size: 0, type: "audio/mpeg" }, { name: "notes.txt", size: 12, type: "text/plain" }, { name: "recording.mp3", size: 10 * 1024 * 1024 + 1, type: "audio/mpeg" }])("rejects invalid audio before decoding %j", file => expect(audioFileError(file)).toBeTruthy());
});

describe("assessment input contracts", () => {
  const base = { questionId: " q1 ", userText: " 我学习中文。 ", hskLevel: "3" };
  it("normalizes the writing payload for the backend", () => expect(writingAssessmentSchema.parse(base)).toEqual({ questionId: "q1", userText: "我学习中文。", hskLevel: 3 }));
  it.each([{ questionId: "" }, { userText: "  \n  " }, { userText: "文".repeat(10001) }, { hskLevel: "3.5" }, { hskLevel: "10" }])("rejects writing data outside the DTO limits %j", values => expect(writingAssessmentSchema.safeParse({ ...base, ...values }).success).toBe(false));
  it("requires pronunciation text and preserves the 5,000-character limit", () => {
    expect(pronunciationAssessmentSchema.safeParse({ referenceText: "  " }).success).toBe(false);
    expect(pronunciationAssessmentSchema.safeParse({ referenceText: "文".repeat(5000) }).success).toBe(true);
    expect(pronunciationAssessmentSchema.safeParse({ referenceText: "文".repeat(5001) }).success).toBe(false);
  });
});
