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

function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\s\u200B-\u200D\uFEFF]+/gu, "")
    .replace(/[。.!！?？，、;；:：]+$/gu, "")
    .toLocaleLowerCase();
}

function selectedAnswerValues(item: PracticeQuestionItem, submitted: string): string[] {
  const normalized = normalizeAnswer(submitted);
  const option = item.options.find(candidate => normalizeAnswer(candidate.optionid) === normalized);
  const values = [submitted];
  if (option?.option_text) values.push(option.option_text);

  if (item.question.type === "TRUE_FALSE") {
    if (["a", "true", "1", "对", "是", "đúng"].includes(normalized)) {
      values.push("true", "1", "对", "是", "đúng");
    } else if (["b", "false", "0", "错", "否", "sai"].includes(normalized)) {
      values.push("false", "0", "错", "否", "sai");
    }
  }
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