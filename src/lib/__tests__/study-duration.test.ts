import { formatStudyClock, formatStudyDuration } from "../study-duration";

it("shows 72 seconds as minutes and seconds instead of fractional minutes", () => {
  expect(formatStudyClock(72)).toBe("1:12");
  expect(formatStudyDuration(72)).toBe("1 phút 12 giây");
});
it("keeps short sessions visible and carries rounded seconds into the next minute", () => {
  expect(formatStudyClock(12)).toBe("0:12");
  expect(formatStudyDuration(12)).toBe("12 giây");
  expect(formatStudyClock(59.6)).toBe("1:00");
  expect(formatStudyDuration(60)).toBe("1 phút");
  expect(formatStudyClock(3600)).toBe("60:00");
});
it("distinguishes zero study time from unavailable data", () => {
  expect(formatStudyClock(0)).toBe("0:00");
  expect(formatStudyClock(-3)).toBe("0:00");
  expect(formatStudyClock(undefined)).toBe("—");
  expect(formatStudyDuration(Number.NaN)).toBe("—");
});
