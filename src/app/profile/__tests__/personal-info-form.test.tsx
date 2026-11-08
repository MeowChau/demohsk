jest.mock("react", () => ({ ...jest.requireActual("react"), useActionState: () => [null, jest.fn(), false] }));
jest.mock("../api-actions", () => ({ updateProfileInfoAction: jest.fn() }));
jest.mock("@/lib/toast", () => ({ notify: { success: jest.fn(), error: jest.fn() } }));

import { renderToStaticMarkup } from "react-dom/server";
import { PersonalInfoForm } from "../personal-info-form";
import type { ProfileDetail } from "@/types/profile";

const profile: ProfileDetail = { userid: "2", email: "learner@example.test", username: "existing_username", role: "student", display_id: null, created_at: "", personid: "2", dob: null, gender: null, phone: null, address: null, avatar_url: null, current_band: 3, target_band: 6, daily_study_time: 30 };

it("shows the saved username as disabled because the existing API does not allow editing it", () => {
  const html = renderToStaticMarkup(<PersonalInfoForm profile={profile} />);
  const username = html.match(/<input[^>]*name="username"[^>]*>/)?.[0];
  expect(username).toContain('value="existing_username"');
  expect(username).toContain("disabled");
  expect(username).not.toContain("required");
  expect(html).toContain("Tên người dùng");
});

it("removes both personal-name inputs and keeps email non-editable", () => {
  const html = renderToStaticMarkup(<PersonalInfoForm profile={profile} />);
  expect(html).not.toMatch(/name="lastName"/);
  expect(html).not.toMatch(/name="firstName"/);
  expect(html.match(/<input[^>]*id="email"[^>]*>/)?.[0]).toContain("disabled");
  expect(html).toContain("Lưu mục tiêu");
});

it("selects the integer HSK values read from the backend", () => {
  const html = renderToStaticMarkup(<PersonalInfoForm profile={profile} />);
  const current = html.match(/<select[^>]*name="currentHskLevel"[^>]*>[\s\S]*?<\/select>/)?.[0];
  const target = html.match(/<select[^>]*name="targetHskLevel"[^>]*>[\s\S]*?<\/select>/)?.[0];
  expect(current).toMatch(/<option(?=[^>]*value="3")(?=[^>]*selected)[^>]*>/);
  expect(target).toMatch(/<option(?=[^>]*value="6")(?=[^>]*selected)[^>]*>/);
  expect(html).not.toContain('value="3.0"');
});
