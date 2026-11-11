// Keep the exam defaults aligned with the Android exam flow (minutes).
export function defaultExamMinutes(level: number): number {
  return ({ 1: 40, 2: 55, 3: 90, 4: 105, 5: 125, 6: 140 } as Record<number, number>)[level] ?? 40;
}

export function parseExamMinutes(value: string): number | null {
  if (!/^\d{1,3}$/.test(value)) return null;
  const minutes = Number(value);
  return minutes >= 1 && minutes <= 180 ? minutes : null;
}

export function remainingExamSeconds(deadline: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
