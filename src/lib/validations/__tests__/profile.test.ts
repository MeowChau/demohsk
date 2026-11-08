import {
  profileInfoSchema,
  settingsSchema,
  changePasswordSchema,
} from "@/lib/validations/profile";

describe("profileInfoSchema", () => {
  const base = {};

  it("accepts the minimum required fields with everything else blank", () => {
    const result = profileInfoSchema.safeParse({
      ...base,
      currentHskLevel: "",
      targetHskLevel: "",
      dailyStudyTime: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an integer current HSK level", () => {
    const result = profileInfoSchema.safeParse({ ...base, currentHskLevel: "6" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currentHskLevel).toBe(6);
  });

  it("rejects a current HSK level above 9", () => {
    const result = profileInfoSchema.safeParse({ ...base, currentHskLevel: "10" });
    expect(result.success).toBe(false);
  });

  it("rejects a current HSK level below 1", () => {
    const result = profileInfoSchema.safeParse({ ...base, currentHskLevel: "-1" });
    expect(result.success).toBe(false);
  });

  it("accepts a target HSK level", () => {
    const result = profileInfoSchema.safeParse({ ...base, targetHskLevel: "7" });
    expect(result.success).toBe(true);
  });

  it("rejects a fractional target HSK level", () => {
    const result = profileInfoSchema.safeParse({ ...base, targetHskLevel: "3.5" });
    expect(result.success).toBe(false);
  });

  it("rejects a target HSK level above 9", () => {
    const result = profileInfoSchema.safeParse({ ...base, targetHskLevel: "10" });
    expect(result.success).toBe(false);
  });

  it("allows saving study goals without a name or surname", () => {
    expect(profileInfoSchema.safeParse({ dailyStudyTime: "30" }).success).toBe(true);
    expect(profileInfoSchema.safeParse({ firstName: "" }).success).toBe(true);
  });

  it("does not include username in the profile update payload", () => {
    expect(profileInfoSchema.parse({ username: "learner", firstName: "An" })).toEqual({});
  });

  it.each(["0", "1441", "30.5"])("rejects invalid daily minutes %s", dailyStudyTime => {
    expect(profileInfoSchema.safeParse({ dailyStudyTime }).success).toBe(false);
  });

  it("strips fields that are not editable through this profile form", () => {
    expect(profileInfoSchema.parse({ firstName: "hidden", lastName: "hidden", role: 1, phone: "123", fullName: "other", dailyStudyTime: "45" })).toEqual({ dailyStudyTime: 45 });
  });
});

describe("settingsSchema", () => {
  it("accepts valid boolean toggles", () => {
    const result = settingsSchema.safeParse({ emailNotifications: true, streakReminders: false });
    expect(result.success).toBe(true);
  });

  it("rejects a non-boolean value", () => {
    const result = settingsSchema.safeParse({ emailNotifications: "yes", streakReminders: false });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts matching passwords of sufficient length", () => {
    const result = changePasswordSchema.safeParse({
      oldPassword: "old-password",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = changePasswordSchema.safeParse({
      oldPassword: "old-password",
      password: "password123",
      confirmPassword: "somethingelse",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a six-character new password as the backend does", () => {
    expect(changePasswordSchema.safeParse({ oldPassword: "old", password: "abc123", confirmPassword: "abc123" }).success).toBe(true);
  });

  it("requires the current password and applies the backend maximum", () => {
    expect(changePasswordSchema.safeParse({ password: "abc123", confirmPassword: "abc123" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ oldPassword: "x".repeat(73), password: "abc123", confirmPassword: "abc123" }).success).toBe(false);
  });
});
