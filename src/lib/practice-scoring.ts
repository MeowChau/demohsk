import type { Question, TestWithQuestions } from "@/types/assessment";

export type GradingMode = "on-submit" | "per-question";

export function parseGradingMode(value: unknown): GradingMode | undefined {
  return value === "on-submit" || value === "per-question" ? value : undefined;
}

export type PracticeQuestionStatus = "correct" | "incorrect" | "unanswered" | "ungraded";

export interface PracticeQuestionGrade {
  questionId: string;
  status: PracticeQuestionStatus;
  correctAnswers: string[];
}

export interface PracticeScore {
  score: number | null;
  correctCount: number;
  totalQuestions: number;
  answeredCount: number;
  gradedCount: number;
  ungradedCount: number;
  unansweredCount: number;
  questions: PracticeQuestionGrade[];
}

type PracticeItem = NonNullable<TestWithQuestions["questionsBySkill"][keyof TestWithQuestions["questionsBySkill"]]>;
type PracticeQuestionItem = PracticeItem[number];

/** Only request Hanzi when the answer key or instruction actually calls for it. */
export function expectsChineseAnswer(item: PracticeQuestionItem): boolean {
  const { question, options } = item;
  if (question.skill === "Speaking" || (options.length > 0 && question.type !== "ESSAY")) return false;
  const accepted = question.acceptedAnswers?.filter(answer => answer.trim());
  if (accepted?.length) return accepted.every(answer => /\p{Script=Han}/u.test(answer));
  // Ambiguous, numeric and pinyin exercises keep a neutral input label.
  return /bằng tiếng Trung|(?:nhập|viết)\s+(?:bằng\s+)?chữ Hán|用(?:中文|汉语)|填写汉字/iu.test(question.question);
}

export function textAnswerError(item: PracticeQuestionItem, answer: string): string | null {
  return answer.trim() && expectsChineseAnswer(item) && !/\p{Script=Han}/u.test(answer)
    ? "Vui lòng nhập câu trả lời có chữ Hán. Nếu chưa trả lời, hãy để trống ô này."
    : null;
}

export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\s\u200B-\u200D\uFEFF]+/gu, "")
    .replace(/[。.!！?？，、;；:：]+$/gu, "")
    .toLocaleLowerCase();
}

const TRUE_VALUES = ["true", "1", "对", "是", "đúng"];
const FALSE_VALUES = ["false", "0", "错", "否", "sai"];
function booleanAnswerValues(value: string): string[] {
  if (value === "a" || TRUE_VALUES.includes(value)) return TRUE_VALUES;
  if (value === "b" || FALSE_VALUES.includes(value)) return FALSE_VALUES;
  return [];
}

export function optionMatchesAnswer(option: { id: string; text: string }, answer: string, type?: string): boolean {
  const expected = normalizeAnswer(answer);
  if (!expected) return false;
  const values = [option.id, option.text];
  if (type === "TRUE_FALSE") {
    values.push(...booleanAnswerValues(normalizeAnswer(option.id)));
  }
  return values.some(value => normalizeAnswer(value) === expected);
}

function selectedAnswerValues(item: PracticeQuestionItem, submitted: string): string[] {
  const normalized = normalizeAnswer(submitted);
  const option = item.options.find(candidate => normalizeAnswer(candidate.optionid) === normalized);
  const values = [submitted];
  if (option?.option_text) values.push(option.option_text);

  if (item.question.type === "TRUE_FALSE") values.push(...booleanAnswerValues(normalized));
  return values.map(normalizeAnswer);
}

export function scorePracticeAttempt(
  items: PracticeQuestionItem[],
  answers: Record<string, string>,
  excludedQuestionIds: ReadonlySet<string> = new Set<string>(),
): PracticeScore {
  let correctCount = 0;
  let gradedCount = 0;
  let answeredCount = 0;
  let unansweredCount = 0;
  let excludedCount = 0;

  const questions = items.map(item => {
    const question = item.question as Question;
    const questionId = question.questionid;
    const submitted = answers[questionId]?.trim() || "";
    const correctAnswers = question.acceptedAnswers || [];
    if (excludedQuestionIds.has(questionId)) {
      excludedCount += 1;
      return { questionId, status: "ungraded" as const, correctAnswers: [] };
    }
    const manuallyGraded = question.manualGrading === true;
    if (submitted) answeredCount += 1;
    else unansweredCount += 1;

    if (manuallyGraded || correctAnswers.length === 0) {
      return { questionId, status: "ungraded" as const, correctAnswers: [] };
    }

    gradedCount += 1;
    if (!submitted) {
      return { questionId, status: "unanswered" as const, correctAnswers };
    }

    const submittedValues = selectedAnswerValues(item, submitted);
    const correct = correctAnswers.some(expected => submittedValues.includes(normalizeAnswer(expected)));
    if (correct) correctCount += 1;

    return {
      questionId,
      status: correct ? "correct" as const : "incorrect" as const,
      correctAnswers,
    };
  });

  return {
    score: gradedCount ? Math.round(correctCount / gradedCount * 100) : null,
    correctCount,
    totalQuestions: items.length,
    answeredCount,
    gradedCount,
    ungradedCount: items.length - gradedCount - excludedCount,
    unansweredCount,
    questions,
  };
}