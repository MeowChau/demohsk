function wholeSeconds(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? null : Math.max(0, Math.round(value));
}

export function formatStudyClock(value: number | null | undefined): string {
  const seconds = wholeSeconds(value);
  return seconds === null ? "—" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function formatStudyDuration(value: number | null | undefined): string {
  const seconds = wholeSeconds(value);
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60), remainder = seconds % 60;
  return minutes ? `${minutes} phút${remainder ? ` ${remainder} giây` : ""}` : `${remainder} giây`;
}
