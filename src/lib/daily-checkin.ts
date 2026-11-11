import type { HskAnalytics } from "@/lib/api/types";

export interface CheckInResponse {
  studyDate: string;
  alreadyCheckedIn: boolean;
  expAwarded: number;
  totalExp: number;
  level: number;
  currentExp: number;
}

export function studyDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function checkedInOnDate(data: Pick<HskAnalytics, "studyDate" | "checkedInToday"> | null, date: string) {
  return data?.studyDate === date && data.checkedInToday === true;
}
