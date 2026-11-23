/** @jest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DailyCheckInCard } from "../daily-checkin-card";
import { apiFetch } from "@/lib/api/client";
import { celebrateWithin } from "@/lib/celebration";
import type { HskAnalytics } from "@/lib/api/types";

const mockRefresh = jest.fn();
const mockStop = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
jest.mock("@/lib/api/client", () => ({ apiFetch: jest.fn() }));
jest.mock("@/lib/celebration", () => ({ celebrateWithin: jest.fn() }));
const initial = { studyDate: "2026-11-23", checkedInToday: false } as HskAnalytics;
const award = { studyDate: "2026-11-23", alreadyCheckedIn: false, expAwarded: 5, totalExp: 15, level: 1, currentExp: 15 };
const originalFrame = window.requestAnimationFrame;
const originalCancel = window.cancelAnimationFrame;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-11-23T10:00:00Z"));
  jest.clearAllMocks();
  window.requestAnimationFrame = callback => window.setTimeout(() => callback(0), 16);
  window.cancelAnimationFrame = id => window.clearTimeout(id);
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.open = false; } });
  jest.mocked(apiFetch).mockResolvedValue(award);
  jest.mocked(celebrateWithin).mockResolvedValue(mockStop);
});
afterEach(() => {
  cleanup();jest.useRealTimers();window.requestAnimationFrame = originalFrame;window.cancelAnimationFrame = originalCancel;
});

it("celebrates a new successful check-in once inside its confirmation and cleans up when closed", async () => {
  const view = render(<DailyCheckInCard initialAnalytics={initial} />);
  expect(celebrateWithin).not.toHaveBeenCalled();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Điểm danh hôm nay" })));
  await act(async () => { jest.advanceTimersByTime(20); });
  const dialog = screen.getByRole("dialog", { name: "Điểm danh thành công" });
  const canvas = dialog.querySelector("canvas");
  expect(canvas).toBeTruthy();
  expect(celebrateWithin).toHaveBeenCalledTimes(1);
  expect(celebrateWithin).toHaveBeenCalledWith(canvas, expect.objectContaining({ particleCount: 28 }));
  view.rerender(<DailyCheckInCard initialAnalytics={{ ...initial, checkedInToday: true }} />);
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(celebrateWithin).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Đã hiểu" }));
  expect(mockStop).toHaveBeenCalledTimes(1);
  expect(document.querySelector("canvas")).toBeNull();
});

it("does not celebrate attendance already present on a later page visit", async () => {
  const first=render(<DailyCheckInCard initialAnalytics={{...initial,checkedInToday:true}} />);
  await act(async()=>{jest.advanceTimersByTime(1000);});first.unmount();
  render(<DailyCheckInCard initialAnalytics={{...initial,checkedInToday:true}} />);
  await act(async()=>{jest.advanceTimersByTime(1000);});
  expect(celebrateWithin).not.toHaveBeenCalled();
  expect((screen.getByRole("button",{name:"Đã điểm danh hôm nay"}) as HTMLButtonElement).disabled).toBe(true);
});

it.each([{...award,alreadyCheckedIn:true,expAwarded:0},{...award,expAwarded:0}])("does not celebrate a response without a new reward",async response=>{
  jest.mocked(apiFetch).mockResolvedValue(response);
  render(<DailyCheckInCard initialAnalytics={initial} />);
  await act(async()=>fireEvent.click(screen.getByRole("button",{name:"Điểm danh hôm nay"})));
  await act(async()=>{jest.advanceTimersByTime(20);});
  expect(celebrateWithin).not.toHaveBeenCalled();
  expect(document.querySelector("canvas")).toBeNull();
});
