import type { Question, TestWithQuestions } from "@/types/assessment";

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