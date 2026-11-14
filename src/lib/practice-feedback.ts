import type { PronunciationAssessment } from "./api/types";
import type { HandwritingStrokeProgress } from "./writing-practice";

export type WritingFeedbackTarget = { id: string; text: string; pinyin?: string };
const normalize = (text: string) => text.normalize("NFKC").trim();
const validScore = (score: unknown): score is number => typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100;
const average = (sum: number, count: number) => count ? Math.round(sum / count * 10) / 10 : null;
export const PRACTICE_FEEDBACK_THRESHOLD = 60;

export function writingFeedback(targets: WritingFeedbackTarget[], progress: Record<string, HandwritingStrokeProgress | undefined>) {
  const words = new Map<string, { text: string; pinyin?: string; mistakes: number; correctStrokes: number; totalStrokes: number }>();
  let attemptedCount = 0;
  for (const target of targets) {
    const item = progress[target.id];
    const text = normalize(target.text);
    if (!text || !item || !(item.totalStrokes > 0 || item.mistakes > 0)) continue;
    attemptedCount++;
    const row = words.get(text) || { text, pinyin: target.pinyin, mistakes: 0, correctStrokes: 0, totalStrokes: 0 };
    row.mistakes += item.mistakes;
    row.correctStrokes += item.correctStrokes;
    row.totalStrokes += item.totalStrokes;
    words.set(text, row);
  }
  return { attemptedCount, rows: [...words.values()].filter(row => row.mistakes > 0)
    .sort((a, b) => b.mistakes - a.mistakes || a.text.localeCompare(b.text, "zh-CN")) };
}

export function pronunciationFeedback(assessments: Record<string, PronunciationAssessment>) {
  const words = new Map<string, { text: string; errors: number; omitted: number; inserted: number; mispronounced: number; scoreSum: number; scoreCount: number }>();
  const phonemes = new Map<string, { text: string; words: Set<string>; errors: number; scoreSum: number; scoreCount: number }>();
  let assessedWordCount = 0;
  let assessedPhonemeCount = 0;
  for (const assessment of Object.values(assessments)) {
    for (const item of assessment.words) {
      const text = normalize(item.word);
      if (!text) continue;
      const errorType = item.errorType.toLowerCase();
      const omitted = errorType === "omission";
      const inserted = errorType === "insertion";
      const mispronounced = !omitted && !inserted && (errorType === "mispronunciation"
        || (validScore(item.accuracyScore) && item.accuracyScore < PRACTICE_FEEDBACK_THRESHOLD));
      if (validScore(item.accuracyScore) || omitted || inserted || mispronounced) assessedWordCount++;
      const row = words.get(text) || { text, errors: 0, omitted: 0, inserted: 0, mispronounced: 0, scoreSum: 0, scoreCount: 0 };
      row.omitted += Number(omitted);
      row.inserted += Number(inserted);
      row.mispronounced += Number(mispronounced);
      row.errors += Number(omitted || inserted || mispronounced);
      // A missing word has no measured pronunciation score, even if a provider sends zero.
      if (!omitted && validScore(item.accuracyScore)) { row.scoreSum += item.accuracyScore; row.scoreCount++; }
      words.set(text, row);
      if (omitted || inserted) continue;
      for (const unit of item.phonemes || []) {
        const phoneme = normalize(unit.phoneme);
        if (!phoneme || !validScore(unit.accuracyScore)) continue;
        assessedPhonemeCount++;
        const sound = phonemes.get(phoneme) || { text: phoneme, words: new Set<string>(), errors: 0, scoreSum: 0, scoreCount: 0 };
        if (unit.accuracyScore < PRACTICE_FEEDBACK_THRESHOLD) { sound.errors++; sound.words.add(text); }
        sound.scoreSum += unit.accuracyScore;
        sound.scoreCount++;
        phonemes.set(phoneme, sound);
      }
    }
  }
  return {
    assessedWordCount, assessedPhonemeCount,
    words: [...words.values()].filter(row => row.errors > 0).map(row => ({ ...row, accuracy: average(row.scoreSum, row.scoreCount) }))
      .sort((a, b) => b.errors - a.errors || (a.accuracy ?? 101) - (b.accuracy ?? 101) || a.text.localeCompare(b.text, "zh-CN")),
    phonemes: [...phonemes.values()].filter(row => row.errors > 0).map(row => ({ ...row, words: [...row.words], accuracy: average(row.scoreSum, row.scoreCount) }))
      .sort((a, b) => b.errors - a.errors || (a.accuracy ?? 101) - (b.accuracy ?? 101) || a.text.localeCompare(b.text)),
  };
}


export function errorDistribution(rows: { label: string; value: number }[]) {
  const ranked = rows.filter(row => Number.isFinite(row.value) && row.value > 0).sort((a, b) => b.value - a.value);
  const total = ranked.reduce((sum, row) => sum + row.value, 0);
  const groups = ranked.slice(0, 5);
  if (ranked.length > 5) groups.push({ label: "Các mục khác", value: ranked.slice(5).reduce((sum, row) => sum + row.value, 0) });
  let offset = 0;
  const slices = groups.map(row => {
    const percent = row.value / total * 100;
    const slice = { ...row, percent, offset };
    offset += percent;
    return slice;
  });
  return { total, slices };
}
