/** @jest-environment jsdom */
jest.mock("../api-actions", () => ({ updateProfileInfoAction: jest.fn() }));
jest.mock("@/lib/toast", () => ({ notify: { success: jest.fn(), error: jest.fn() } }));

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PersonalInfoForm } from "../personal-info-form";
import { updateProfileInfoAction } from "../api-actions";
import { notify } from "@/lib/toast";
import type { ProfileDetail } from "@/types/profile";

const profile: ProfileDetail = { userid: "2", email: "learner@example.test", username: "existing_username", role: "student", display_id: null, created_at: "", personid: "2", dob: null, gender: null, phone: null, address: null, avatar_url: null, current_band: 3, target_band: 6, daily_study_time: 30 };
const message = "Cấp độ HSK mục tiêu phải bằng hoặc cao hơn cấp độ hiện tại.";
const current = () => screen.getByLabelText("Cấp độ HSK hiện tại") as HTMLSelectElement;
const target = () => screen.getByLabelText("Cấp độ HSK mục tiêu") as HTMLSelectElement;
const minutes = () => screen.getByLabelText("Mục tiêu học mỗi ngày (phút)") as HTMLInputElement;
const submit = () => fireEvent.submit(screen.getByRole("button", { name: "Lưu mục tiêu" }).closest("form")!);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(updateProfileInfoAction).mockResolvedValue({ success: true });
});
afterEach(cleanup);

it("shows the saved username as disabled because the existing API does not allow editing it", () => {
  render(<PersonalInfoForm profile={profile} />);
  const username = screen.getByLabelText("Tên người dùng") as HTMLInputElement;
  expect(username.value).toBe("existing_username");
  expect(username.disabled).toBe(true);
  expect(username.required).toBe(false);
});

it("removes both personal-name inputs and keeps email non-editable", () => {
  const { container } = render(<PersonalInfoForm profile={profile} />);
  expect(container.querySelector('[name="lastName"]')).toBeNull();
  expect(container.querySelector('[name="firstName"]')).toBeNull();
  expect((screen.getByLabelText("Email") as HTMLInputElement).disabled).toBe(true);
  expect(screen.getByRole("button", { name: "Lưu mục tiêu" })).toBeTruthy();
});

it("selects the integer HSK values read from the backend", () => {
  render(<PersonalInfoForm profile={profile} />);
  expect(current().value).toBe("3");
  expect(target().value).toBe("6");
});

it("retains a previously saved target below the current level and explains the invalid value", () => {
  render(<PersonalInfoForm profile={{ ...profile, target_band: 1 }} />);
  expect(target().value).toBe("1");
  submit();
  expect(screen.getByText(message)).toBeTruthy();
  expect(target().getAttribute("aria-invalid")).toBe("true");
  expect(target().getAttribute("aria-describedby")).toContain("targetHskLevel-error");
  expect(document.activeElement).toBe(target());
  expect(target().value).toBe("1");
  expect(updateProfileInfoAction).not.toHaveBeenCalled();
});

it("blocks a lower target without resetting the chosen levels or daily minutes, then saves the correction", async () => {
  render(<PersonalInfoForm profile={profile} />);
  fireEvent.change(target(), { target: { value: "1" } });
  fireEvent.change(minutes(), { target: { value: "45" } });
  submit();
  expect(screen.getByText(message)).toBeTruthy();
  expect(current().value).toBe("3");
  expect(target().value).toBe("1");
  expect(minutes().value).toBe("45");
  expect(updateProfileInfoAction).not.toHaveBeenCalled();
  expect(notify.success).not.toHaveBeenCalled();
  fireEvent.change(target(), { target: { value: "3" } });
  expect(screen.queryByText(message)).toBeNull();
  submit();
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Đã cập nhật mục tiêu học."));
  expect(notify.success).toHaveBeenCalledWith("Đã cập nhật mục tiêu học.");
  const submitted = jest.mocked(updateProfileInfoAction).mock.calls[0]![0];
  expect(Object.fromEntries(submitted)).toEqual({ currentHskLevel: "3", targetHskLevel: "3", dailyStudyTime: "45" });
  expect(target().value).toBe("3");
  expect(minutes().value).toBe("45");
});

it("does not silently increase the target when the current level is raised", () => {
  render(<PersonalInfoForm profile={{ ...profile, current_band: 1, target_band: 1 }} />);
  fireEvent.change(current(), { target: { value: "3" } });
  expect(target().value).toBe("1");
  submit();
  expect(screen.getByText(message)).toBeTruthy();
  expect(updateProfileInfoAction).not.toHaveBeenCalled();
});

it("keeps drafts and shows the target field error when the server rejects the save", async () => {
  jest.mocked(updateProfileInfoAction).mockResolvedValue({ error: "Vui lòng kiểm tra cấp độ HSK mục tiêu.", fieldErrors: { targetHskLevel: message } });
  render(<PersonalInfoForm profile={profile} />);
  fireEvent.change(target(), { target: { value: "4" } });
  fireEvent.change(minutes(), { target: { value: "45" } });
  submit();
  await waitFor(() => expect(screen.getByText(message)).toBeTruthy());
  expect(target().value).toBe("4");
  expect(minutes().value).toBe("45");
  expect(screen.queryByRole("status")).toBeNull();
  expect(notify.success).not.toHaveBeenCalled();
});

it("preserves save feedback through refreshed profile data and syncs a later HSK promotion", async () => {
  const view = render(<PersonalInfoForm profile={profile} />);
  fireEvent.change(current(), { target: { value: "4" } });
  fireEvent.change(target(), { target: { value: "5" } });
  fireEvent.change(minutes(), { target: { value: "45" } });
  submit();
  await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
  view.rerender(<PersonalInfoForm profile={{ ...profile, current_band: 4, target_band: 5, daily_study_time: 45 }} />);
  expect(current().value).toBe("4");
  expect(target().value).toBe("5");
  expect(minutes().value).toBe("45");
  expect(screen.getByRole("status").textContent).toContain("Đã cập nhật mục tiêu học.");
  expect(notify.success).toHaveBeenCalledTimes(1);
  view.rerender(<PersonalInfoForm profile={{ ...profile, current_band: 5, target_band: 5, daily_study_time: 45 }} />);
  expect(current().value).toBe("5");
  expect(target().value).toBe("5");
});

it("clears the previous success confirmation when an edited draft fails validation", async () => {
  render(<PersonalInfoForm profile={profile} />);
  fireEvent.change(target(), { target: { value: "4" } });
  submit();
  await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
  fireEvent.change(target(), { target: { value: "1" } });
  submit();
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByText(message)).toBeTruthy();
  expect(target().value).toBe("1");
  expect(updateProfileInfoAction).toHaveBeenCalledTimes(1);
  expect(notify.success).toHaveBeenCalledTimes(1);
});
