import type { TestWithQuestions } from "@/types/assessment";
import { publicMedia } from "@/lib/api/config";
import { writingPractice } from "@/lib/writing-practice";

type QuestionItem = NonNullable<TestWithQuestions["questionsBySkill"][keyof TestWithQuestions["questionsBySkill"]]>[number];

export interface QuestionAudioGroup {
  id: string;
  audioUrl: string | null;
  shared: boolean;
  items: QuestionItem[];
}

// Adjacent questions share a player; reusing a track later keeps a separate section.
export function groupPracticeAudio(items: readonly QuestionItem[], fallbackAudioUrl?: string | null): QuestionAudioGroup[] {
  const fallback = publicMedia(fallbackAudioUrl);
  const audioFor = (item: QuestionItem) => item.question.skill === "Speaking" || writingPractice(item.question)
    ? null : publicMedia(item.question.audio_url || fallbackAudioUrl);
  const groups: QuestionAudioGroup[] = [];
  for (let start = 0; start < items.length;) {
    const audioUrl = audioFor(items[start]!);
    let end = start + 1;
    while (end < items.length && audioFor(items[end]!) === audioUrl) end++;
    const questions = items.slice(start, end);
    groups.push({
      id: "audio-group-" + items[start]!.question.questionid,
      audioUrl,
      shared: Boolean(audioUrl && (questions.length > 1 || audioUrl === fallback || questions.some(item => item.question.sharedAudio))),
      items: questions,
    });
    start = end;
  }
  return groups;
}

export function pauseOtherPracticeAudio(current: HTMLAudioElement) {
  current.closest("form")?.querySelectorAll("audio").forEach(other => {
    if (other !== current) other.pause();
  });
}
