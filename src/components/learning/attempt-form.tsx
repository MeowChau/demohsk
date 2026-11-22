"use client";

import { createContext, memo, useContext, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type SetStateAction } from "react";
import { useStore } from "zustand";
import { createAttemptStore, type AttemptStore, type AttemptValues } from "./attempt/attempt-store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError } from "@/lib/api/client";
import type { LearningScoreSubmission, LearningAttemptContext } from "@/lib/learning-scores";
import { markLearningScoresUpdated, submitLearningScore } from "@/lib/learning-scores";
import { historyHref, historyResultHref } from "@/lib/learning-history";
import { ClipboardCheck, Flag, LayoutGrid } from "lucide-react";
import { SKILL_LABELS } from "@/lib/hsk";
import { formatScore } from "@/lib/utils";
import type { TestWithQuestions, Skill, Question } from "@/types/assessment";
import type { PronunciationAssessment } from "@/lib/api/types";
import { publicMedia } from "@/lib/api/config";
import { HanziPractice } from "@/components/learning/hanzi-practice";
import { SpeakingRecorder } from "@/components/learning/speaking-recorder";
import { PronunciationButton } from "@/components/learning/pronunciation-button";
import { QuestionImage, optionDisplayText } from "@/components/learning/question-content";
import { SharedAudioSection } from "@/components/learning/shared-audio-section";
import { groupPracticeSections, pauseOtherPracticeAudio, type QuestionAudioGroup } from "@/lib/practice-audio";
import { QuestionNavigator, type QuestionNavigationGroup } from "@/components/learning/question-navigator";
import { writingPractice, sameHandwritingStrokes, type HandwritingProgress, type HandwritingStrokeProgress } from "@/lib/writing-practice";
import { expectsChineseAnswer, textAnswerError, optionMatchesAnswer, scorePracticeAttempt, type PracticeScore, type GradingMode } from "@/lib/practice-scoring";
import { GradingModeOptions } from "./attempt/grading-mode-options";
import { WritingErrorTable, SpeakingErrorTable } from "./attempt/skill-error-summary";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useBlockNavigation } from "@/components/shell/navigation-protection";
import { remainingExamSeconds } from "@/lib/exam-timing";
import { promotionMessage } from "@/lib/hsk-promotion";

function RefreshProfileAfterPromotion() {
  const router = useRouter();
  useEffect(() => { router.refresh(); }, [router]);
  return null;
}

type Option = { optionid: string; option_text: string; image_url?: string | null };

type AttemptProps = { attemptid: string; testid: string; data: TestWithQuestions; recordScores?: boolean; initialGradingMode?: GradingMode };
const AttemptContext = createContext<AttemptStore | null>(null);
function useAttemptStore() {
  const store = useContext(AttemptContext);
  if (!store) throw new Error("Attempt components require Attempt.Root");
  return store;
}
function useAttemptField<K extends keyof AttemptValues>(key: K) {
  const store = useAttemptStore();
  const value = useStore(store, state => state[key]);
  const setValue = useCallback((next: SetStateAction<AttemptValues[K]>) => store.getState().setField(key, next), [store,key]);
  return [value,setValue] as const;
}
export function AttemptForm(props: AttemptProps) { return <Attempt.Root key={props.testid + props.attemptid} {...props} />; }
function AttemptRoot(props: AttemptProps) {
  const [store] = useState(() => createAttemptStore(Object.values(props.data.questionsBySkill).flatMap(x => x || [])[0]?.question.questionid ?? null));
  return <AttemptContext.Provider value={store}><AttemptContent {...props} /></AttemptContext.Provider>;
}
function AttemptContent({ attemptid, testid, data, recordScores = false, initialGradingMode }: AttemptProps) {
  const store = useAttemptStore();
  const [gradingMode, setGradingMode] = useState<GradingMode>(initialGradingMode || "on-submit");
  const [pendingMode, setPendingMode] = useState<GradingMode>(initialGradingMode || "on-submit");
  const [started, setStarted] = useState(!recordScores || Boolean(initialGradingMode));
  const [modeDialogOpen, setModeDialogOpen] = useState(recordScores && !initialGradingMode);
  const [checkedQuestions] = useAttemptField("checkedQuestions");
  const phase = useStore(store, state => state.phase);
  const [answers, setAnswers] = useAttemptField("answers");
  const [handwriting, setHandwriting] = useAttemptField("handwriting");
  const [strokeStats, setStrokeStats] = useAttemptField("strokeStats");
  const [speakingAssessments, setSpeakingAssessments] = useAttemptField("speakingAssessments");
  const [recordedQuestions, setRecordedQuestions] = useAttemptField("recordedQuestions");
  const [speakingBusy, setSpeakingBusy] = useAttemptField("speakingBusy");
  const [attemptVersion, setAttemptVersion] = useState(0);
  const [bookmarks, setBookmarks] = useAttemptField("bookmarks");
  const [questionMenuOpen, setQuestionMenuOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<"leave" | "submit" | null>(null);
  const pendingLeave = useRef<(() => void) | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useAttemptField("activeQuestionId");
  const [notice, setNotice] = useState("");
  const [showTextErrors, setShowTextErrors] = useState(false);
  const [result, setResult] = useAttemptField("result");
  const reviewing = phase === "reviewing";
  const setReviewing = store.getState().review;
  const showQuestions = !result || reviewing;
  const [savedScore, setSavedScore] = useAttemptField("savedScore");
  const savingScore = phase === "saving";
  const scoreError = useStore(store, state => state.error);
  const scoreBusy = useRef(false);
  const scorePayload = useRef<LearningScoreSubmission | null>(null);
  const scoreAttemptId = useRef(globalThis.crypto?.randomUUID?.() || "attempt-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2));
  const attemptStartedAt = useRef(Date.now());
  const examDeadline = useRef(attemptStartedAt.current + data.test.duration * 60_000);
  const sourceReference = /^(exam|set)-(\d+)$/.exec(testid);
  const attemptContext: LearningAttemptContext | undefined = useMemo(() => recordScores && sourceReference
    ? { attemptId: scoreAttemptId.current, kind: sourceReference[1] as "exam" | "set", sourceId: Number(sourceReference[2]) } : undefined,
    // Reset creates a new logical attempt and reference for speech requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recordScores, testid, attemptVersion]);
  const isExam = /^exam-/.test(testid);

  const [expired, setExpired] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const autoSubmitted = useRef(false);

  const keepSelectedQuestion = useRef(false);

  const questions = useMemo(() => Object.values(data.questionsBySkill).flatMap(items => items || []), [data.questionsBySkill]);
  const questionSections = useMemo(() => groupPracticeSections(data), [data]);
  const { validAnswers, invalidTextQuestions } = useMemo(() => {
    const validAnswers = { ...answers };
    const invalidTextQuestions = questions.filter(item => {
      if (!textAnswerError(item, answers[item.question.questionid] || "")) return false;
      delete validAnswers[item.question.questionid];
      return true;
    });
    return { validAnswers, invalidTextQuestions };
  }, [answers, questions]);
  const hasSpeakingWorkInProgress = Object.values(speakingBusy).some(Boolean);

  useEffect(() => {
    if (result) {
      resultRef.current?.focus({ preventScroll: true });
      resultRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  useEffect(() => {
    if (!started || !showQuestions || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<HTMLElement>();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const target = entry.target as HTMLElement;
        if (entry.isIntersecting) visible.add(target);
        else visible.delete(target);
      });
      const first = [...visible].sort((left, right) => left.getBoundingClientRect().top - right.getBoundingClientRect().top)[0];
      const id = first?.dataset.practiceQuestion;
      if (id && !keepSelectedQuestion.current) setActiveQuestionId(id);
    }, { rootMargin: "-160px 0px -45% 0px", threshold: 0 });
    formRef.current?.querySelectorAll<HTMLElement>("[data-practice-question]").forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [questions, attemptVersion, showQuestions, started, setActiveQuestionId]);

  useEffect(() => {
    const resumeScrollTracking = () => { keepSelectedQuestion.current = false; };
    const onScrollKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select"))) return;
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) resumeScrollTracking();
    };
    window.addEventListener("wheel", resumeScrollTracking, { passive: true });
    window.addEventListener("touchmove", resumeScrollTracking, { passive: true });
    window.addEventListener("keydown", onScrollKey);
    return () => {
      window.removeEventListener("wheel", resumeScrollTracking);
      window.removeEventListener("touchmove", resumeScrollTracking);
      window.removeEventListener("keydown", onScrollKey);
    };
  }, []);

  const selectQuestion = useCallback((questionId: string) => {
    keepSelectedQuestion.current = true;
    setActiveQuestionId(questionId);
    const element = document.getElementById("practice-question-" + questionId);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    element?.scrollIntoView?.({ behavior: reducedMotion ? "instant" : "smooth", block: "start" });
  }, [setActiveQuestionId]);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const measure = () => {
      const height = toolbar.getBoundingClientRect().height;
      if (height > 0) formRef.current?.style.setProperty("--practice-toolbar-height", height + "px");
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(toolbar);
    return () => observer?.disconnect();
  }, [started]);

  const strokeSummary = Object.values(strokeStats).reduce((summary, item) => ({
    correctStrokes: summary.correctStrokes + item.correctStrokes,
    totalStrokes: summary.totalStrokes + item.totalStrokes,
    mistakes: summary.mistakes + item.mistakes,
  }), { correctStrokes: 0, totalStrokes: 0, mistakes: 0 });
  const tracingQuestions = useMemo(() => questions.filter(item => writingPractice(item.question) !== null), [questions]);
  const tracingTargets = useMemo(() => tracingQuestions.map(({ question }) => ({
    id: question.questionid, text: writingPractice(question)?.text || "", pinyin: question.pinyin,
  })), [tracingQuestions]);
  const writingCompleted = Object.values(handwriting).reduce((sum, item) => sum + item.completedPositions.length, 0);
  const writingTotal = Object.values(handwriting).reduce((sum, item) => sum + item.totalCharacters, 0);
  const speakingQuestionCount = useMemo(() => questions.filter(item => item.question.skill === "Speaking").length, [questions]);
  const speakingValues = Object.values(speakingAssessments);
  const recordingCount = Object.values(recordedQuestions).filter(Boolean).length;
  const speakingAverage = speakingValues.length
    ? Math.round(speakingValues.reduce((sum, item) => sum + item.score, 0) / speakingValues.length * 10) / 10
    : null;
  const workedQuestionIds = new Set([
    ...Object.entries(validAnswers).filter(([, answer]) => Boolean(answer.trim())).map(([id]) => id),
    ...Object.entries(strokeStats).filter(([, progress]) => progress.correctStrokes > 0 || progress.mistakes > 0).map(([id]) => id),
    ...Object.entries(handwriting).filter(([, progress]) => progress.completedPositions.length > 0).map(([id]) => id),
    ...Object.entries(recordedQuestions).filter(([, recorded]) => recorded).map(([id]) => id),
  ]);
  const checkedGrades = Object.values(checkedQuestions);
  const checkedCorrectCount = checkedGrades.filter(grade => grade.status === "correct").length;
  const gradeByQuestion = new Map((savingScore ? [] : result?.questions || (gradingMode === "per-question" ? checkedGrades : [])).map(grade => [grade.questionId, grade] as const));
  const questionNumbers = useMemo(() => new Map(questions.map((item, index) => [item.question.questionid, index + 1])), [questions]);

  const markedCount = Object.values(bookmarks).filter(Boolean).length;
  const completedQuestionCount = questions.filter(({ question }) => {
    if (question.skill === "Speaking") return Boolean(speakingAssessments[question.questionid]);
    if (writingPractice(question)) {
      const progress = handwriting[question.questionid];
      return Boolean(progress && progress.totalCharacters > 0 && progress.completedPositions.length >= progress.totalCharacters);
    }
    return Boolean(validAnswers[question.questionid]?.trim());
  }).length;
  const unfinishedCount = questions.length - completedQuestionCount;
  const hasUnpersistedResult = Boolean(result && recordScores && scorePayload.current && !savedScore);
  const hasUnsubmittedAttempt = started && !result && questions.length > 0;

  useBlockNavigation(hasUnsubmittedAttempt || hasUnpersistedResult, proceed => {
    pendingLeave.current = proceed;
    setQuestionMenuOpen(false);
    setConfirmation("leave");
  });

  function closeConfirmation() {
    pendingLeave.current = null;
    setConfirmation(null);
    store.getState().cancelConfirm();
  }

  async function persistScore(payload: LearningScoreSubmission) {
    if (scoreBusy.current || !store.getState().claim(payload)) return;
    scoreBusy.current = true;
    try {
      const saved = await submitLearningScore(payload);
      store.getState().complete(saved);
      setNotice(saved.historyId ? "Đã lưu bài làm vào lịch sử theo tài khoản." : "Đã cập nhật điểm tổng hợp theo tài khoản.");
      markLearningScoresUpdated();
    } catch (cause) {
      store.getState().fail(cause instanceof ApiError && cause.status === 401 ? "Phiên đăng nhập đã hết hạn. Câu trả lời vẫn được giữ trên trang. Vui lòng đăng nhập lại rồi thử lưu điểm."
        : cause instanceof ApiError && cause.status === 404 ? "Backend chưa được cập nhật chức năng tính điểm này. Câu trả lời vẫn còn trên trang để thử lại."
        : cause instanceof Error ? cause.message : "Chưa lưu được kết quả. Hãy thử lại.");
    } finally { scoreBusy.current = false; }
  }

  function finishAttempt() {
    if (!started || result || scoreBusy.current || Object.values(store.getState().speakingBusy).some(Boolean)) return;
    closeConfirmation();
    formRef.current?.querySelectorAll("audio").forEach(audio => audio.pause());
    setReviewing(false);
    setNotice("");
    const separatelyTracked = new Set(questions
      .filter(item => item.question.skill === "Speaking" || writingPractice(item.question) !== null)
      .map(item => item.question.questionid));
    setResult(scorePracticeAttempt(questions, validAnswers, separatelyTracked));
    const reference = /^(exam|set)-(\d+)$/.exec(testid);
    if (recordScores && reference) {
      const payload: LearningScoreSubmission = { attemptId: scoreAttemptId.current, kind: reference[1] as "exam" | "set", sourceId: Number(reference[2]), answers: validAnswers,
        startedAt: new Date(attemptStartedAt.current).toISOString(), durationSeconds: Math.min(data.test.duration > 0 ? data.test.duration * 60 : 604800, Math.max(0, Math.floor((Date.now() - attemptStartedAt.current) / 1000))),
        writingProgress: Object.fromEntries(Object.entries(handwriting).map(([id, progress]) => [id, { completedPositions: progress.completedPositions,
          ...(strokeStats[id] || { correctStrokes: 0, totalStrokes: 0, mistakes: 0 }) }])) };
      scorePayload.current = payload; void persistScore(payload);
    }

  }

  function confirmAction() {
    if (confirmation === "submit") {
      finishAttempt();
      return;
    }
    const proceed = pendingLeave.current;
    closeConfirmation();
    if (proceed) {
      formRef.current?.querySelectorAll("audio").forEach(audio => audio.pause());
      proceed();
    }
  }

  const navigationGroups: QuestionNavigationGroup[] = (Object.entries(data.questionsBySkill) as [Skill, typeof data.questionsBySkill[Skill]][])
    .map(([skill, items]) => ({
      skill,
      title: SKILL_LABELS[skill],
      items: (items || []).map(({ question }) => {
        const grade = gradeByQuestion.get(question.questionid);
        return {
          id: question.questionid,
          number: questionNumbers.get(question.questionid) || 1,
          status: grade?.status === "correct" ? "correct" as const : grade?.status === "incorrect" ? "incorrect" as const
            : workedQuestionIds.has(question.questionid) ? "answered" as const : "unanswered" as const,
          bookmarked: Boolean(bookmarks[question.questionid]),
        };
      }),
    }));
  function downloadBackup() {
    const backup = {
      testid,
      answers,
      handwriting,
      ...(Object.keys(strokeStats).length ? { strokeStats } : {}),
      ...(speakingValues.length ? { speakingAssessments } : {}),
      ...(markedCount ? { bookmarkedQuestionIds: Object.keys(bookmarks).filter(id => bookmarks[id]) } : {}),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "hsk-" + testid + ".json";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Đã tải bản sao câu trả lời và kết quả luyện tập về thiết bị.");
  }

  function resetAttempt() {
    if (scoreBusy.current) return;
    setSavedScore(null); scorePayload.current = null;
    scoreAttemptId.current = globalThis.crypto?.randomUUID?.() || "attempt-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    attemptStartedAt.current = Date.now();
    examDeadline.current = attemptStartedAt.current + data.test.duration * 60_000;
    setAnswers({});
    setShowTextErrors(false);
    setHandwriting({});
    setStrokeStats({});
    setSpeakingAssessments({});
    setRecordedQuestions({});
    setSpeakingBusy({});
    setBookmarks({});
    setQuestionMenuOpen(false);
    keepSelectedQuestion.current = false;
    setActiveQuestionId(questions[0]?.question.questionid ?? null);
    setAttemptVersion(version => version + 1);
    setNotice("");
    setResult(null);
    setReviewing(false);
    setExpired(false);
    store.getState().reset();
    autoSubmitted.current = false;
  }

  function startAttempt() {
    if (scoreBusy.current || hasUnpersistedResult) return;
    if (result) resetAttempt();
    else {
      attemptStartedAt.current = Date.now();
      examDeadline.current = attemptStartedAt.current + data.test.duration * 60_000;
      setAttemptVersion(version => version + 1);
    }
    setGradingMode(pendingMode);
    setStarted(true);
    setModeDialogOpen(false);
  }

  function renderQuestion({ question, options }: { question: Question; options: Option[] }, showIndividualAudio = true) {
    return (
      <Attempt.Question
        key={question.questionid + "-" + attemptVersion}
        number={questionNumbers.get(question.questionid) || 1} question={question} options={options}
        recordingLocked={hasSpeakingWorkInProgress && !speakingBusy[question.questionid]}
        sampleAudioDisabled={hasSpeakingWorkInProgress} showIndividualAudio={showIndividualAudio}
        grade={gradeByQuestion.get(question.questionid)} submitted={Boolean(result)}
        persistScores={recordScores} attemptContext={attemptContext} gradingMode={gradingMode} showTextErrors={showTextErrors}
      />
    );
  }

  function renderAudioQuestions(groups: QuestionAudioGroup[]) {
    return groups.map(group => {
      const content = group.items.map(item => renderQuestion(item, !group.shared));
      if (!group.shared || !group.audioUrl) {
        return <div key={group.id} className="flex min-w-0 flex-col gap-5">{content}</div>;
      }
      const first = questionNumbers.get(group.items[0]!.question.questionid) || 1;
      const last = questionNumbers.get(group.items[group.items.length - 1]!.question.questionid) || first;
      const label = first === last ? "Câu " + first : "Câu " + first + "–" + last;
      return <SharedAudioSection key={group.id + "-" + attemptVersion} src={group.audioUrl} label={label}>{content}</SharedAudioSection>;
    });
  }
  return (
    <>
    {recordScores && savedScore?.currentHskLevel != null && savedScore.currentHskLevel > (savedScore.previousCurrentHskLevel ?? 0) && <RefreshProfileAfterPromotion />}
    {started ? <form ref={formRef} className="flex flex-col gap-6" onSubmit={event => {
      event.preventDefault();
      if (!started || result) return;
      if (Object.values(store.getState().speakingBusy).some(Boolean)) {
        setNotice("Hãy dừng ghi âm và đợi nhận diện giọng nói xong rồi nộp bài.");
        return;
      }
      setNotice("");
      if (autoSubmitted.current && data.test.duration > 0) {
        finishAttempt();
        return;
      }
      if (invalidTextQuestions.length > 0) {
        setShowTextErrors(true);
        const id = invalidTextQuestions[0]!.question.questionid;
        selectQuestion(id);
        document.getElementById("practice-answer-" + id)?.focus({ preventScroll: true });
        return;
      }
      setQuestionMenuOpen(false);
      store.getState().confirm();
      setConfirmation("submit");
    }}>
      <input type="hidden" name="attemptid" value={attemptid} />
      <input type="hidden" name="testid" value={testid} />
      <div ref={toolbarRef} className="sticky top-[5.5rem] z-30 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-mist bg-surface px-4 py-3 shadow-card">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{workedQuestionIds.size}/{questions.length} câu đã làm</p>
          <p className="mt-1 text-xs text-slate">{gradingMode === "per-question" ? "Chấm ngay từng câu" : "Chấm khi nộp bài"}</p>
          {!result && gradingMode === "per-question" && checkedGrades.length > 0 && <p className="mt-1 text-xs font-medium text-brand dark:text-ink" role="status">
            Đã chấm {checkedGrades.length} câu · Đúng {checkedCorrectCount}/{checkedGrades.length} · Chính xác {Math.round(checkedCorrectCount / checkedGrades.length * 100)}%
          </p>}
          <Attempt.Timer duration={data.test.duration} deadline={examDeadline.current} version={attemptVersion}
            stopped={Boolean(result)} blocked={hasSpeakingWorkInProgress} onExpire={() => {
              autoSubmitted.current = true; setExpired(true); formRef.current?.requestSubmit();
            }} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showQuestions && <button type="button" aria-label="Mở danh sách câu hỏi" title="Mở danh sách câu hỏi"
            aria-expanded={questionMenuOpen} aria-controls="practice-question-menu"
            onClick={() => setQuestionMenuOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-mist text-brand hover:bg-brand/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand lg:hidden">
            <LayoutGrid size={20} aria-hidden="true" />
          </button>}
          {result ? <button type="button" className="hsk-button" disabled={savingScore || hasUnpersistedResult} onClick={() => { setPendingMode(gradingMode); setModeDialogOpen(true); }}>Làm lại</button>
            : <button type="submit" className="hsk-button" disabled={hasSpeakingWorkInProgress}>Nộp bài</button>}
        </div>
      </div>

      <div className={showQuestions ? "grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_19rem]" : "min-w-0"}>
        <div className="flex min-w-0 flex-col gap-6">


      {result && (
        <section ref={resultRef} tabIndex={-1} aria-label="Kết quả luyện tập" className="hsk-panel flex scroll-mt-24 flex-col gap-4 outline-none">
          <h2 className="font-display text-lg font-semibold text-ink">{isExam ? "Kết quả bài thi" : "Kết quả luyện tập"}</h2>
          {isExam && expired && <p className="hsk-notice">Đã hết thời gian. Hệ thống tự nộp câu trả lời của bạn.
            {invalidTextQuestions.length > 0 && " Có " + invalidTextQuestions.length + " câu chưa nhập chữ Hán, được tính là chưa trả lời."}
          </p>}
          <div className="flex flex-wrap items-center gap-3">
            {savedScore?.historyId ? <>
              <p className="text-sm font-medium text-success">Đã lưu vào lịch sử</p>
              <Link className="hsk-button-secondary" href={historyResultHref(savedScore.historyId)}>Xem lại bài làm</Link>
              <Link className="text-sm font-medium text-brand" href={historyHref({ kind: sourceReference?.[1] || "", sourceId: sourceReference?.[2] || "" })}>Lịch sử bài này →</Link>
            </> : !savingScore && <button type="button" className="hsk-button-secondary" aria-expanded={reviewing}
              aria-controls="practice-attempt-questions" onClick={() => setReviewing(current => !current)}>
              {reviewing ? "Ẩn chi tiết bài làm" : "Xem lại bài làm"}
            </button>}
          </div>
          {savingScore && <p className="hsk-notice" role="status">Đang chấm theo đáp án và cập nhật điểm kỹ năng…</p>}
          {scoreError && <div className="rounded-lg border border-danger/20 bg-danger-soft p-3 text-sm text-danger" role="alert"><p>{scoreError}</p><button type="button" className="hsk-button-secondary mt-3" disabled={savingScore} onClick={() => { if (scorePayload.current) void persistScore(scorePayload.current); }}>Thử lưu điểm lại</button></div>}
          {savedScore && isExam && <div className="rounded-lg border border-brand/20 bg-brand/5 p-4">
            <p className="text-xs text-slate">Điểm thi thử — tổng điểm từng phần</p>
            <p className="mt-1 text-2xl font-semibold text-brand">{savedScore.totalScore === null ? "Chưa có điểm toàn đề hợp lệ" : formatScore(savedScore.totalScore) + "/" + savedScore.maxScore}</p>
            <div className="mt-3 flex flex-wrap gap-3">{savedScore.sections.map(section => <p key={section.skill} className="text-sm text-slate">{SKILL_LABELS[section.skill]}: {section.score === null ? "Chưa chấm" : formatScore(section.score) + "/100"}{!section.complete && " · chưa đầy đủ"}</p>)}</div>
            {savedScore.passed && <p className="mt-3 text-sm font-semibold text-brand">Đạt ngưỡng của đề HSK {savedScore.hskLevel}. {promotionMessage(savedScore)}</p>}
            {savedScore.eligible && !savedScore.passed && <p className="mt-3 text-sm font-semibold text-brand">Chưa đạt ngưỡng {savedScore.passScore}/{savedScore.maxScore}. Mức HSK đã ghi nhận được giữ nguyên.</p>}
            {savedScore.reasons.length > 0 && <ul className="mt-3 list-disc pl-4 text-xs leading-6 text-slate">{savedScore.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
            <p className="mt-3 text-xs leading-5 text-slate">Đây là kết quả luyện thi nội bộ. Mức HSK không lấy từ điểm trung bình bốn kỹ năng và không tự đổi mục tiêu học tập.</p>
          </div>}
          {!savingScore && result.gradedCount > 0 && (!isExam || !savedScore) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-brand/5 p-4">
                <p className="text-xs text-slate">Điểm đối chiếu đáp án</p>
                <p className="mt-1 text-2xl font-semibold text-brand">{formatScore(result.score)}/100</p>
              </div>
              <div className="rounded-lg bg-paper p-4">
                <p className="text-xs text-slate">Số câu đúng</p>
                <p className="mt-1 text-2xl font-semibold text-ink">{result.correctCount}/{result.gradedCount}</p>
              </div>
            </div>
          )}
          {tracingQuestions.length > 0 && (
            <div className="rounded-lg border border-mist p-4">
              <h3 className="font-semibold text-ink">Kết quả luyện viết</h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                <div><dt className="text-xs text-slate">Nét viết đúng</dt><dd className="mt-1 font-semibold text-success">{strokeSummary.correctStrokes}/{strokeSummary.totalStrokes} nét đã mở</dd></div>
                <div><dt className="text-xs text-slate">Lượt nét cần cải thiện</dt><dd className="mt-1 font-semibold text-ink">{strokeSummary.mistakes}</dd></div>
                <div><dt className="text-xs text-slate">Chữ đã hoàn thành</dt><dd className="mt-1 font-semibold text-brand">{writingCompleted}/{writingTotal}</dd></div>
              </dl>
              <p className="mt-3 text-xs leading-5 text-slate">Kết quả ghi nhận từ phần nhận diện nét khi luyện viết. Các chữ chưa mở chưa có trong tổng số nét.</p>
              <WritingErrorTable targets={tracingTargets} progress={strokeStats} />
            </div>
          )}
          {speakingQuestionCount > 0 && (
            <div className="rounded-lg border border-mist p-4">
              <h3 className="font-semibold text-ink">Kết quả luyện nói</h3>
              <p className="mt-2 text-xl font-semibold text-brand">{speakingAverage === null ? "Chưa có điểm phát âm" : formatScore(speakingAverage) + "/100"}</p>
              <p className="mt-2 text-sm leading-6 text-slate">Đã ghi âm {recordingCount}/{speakingQuestionCount} câu · đã chấm {speakingValues.length} câu.</p>
              {speakingValues.length < recordingCount && <p className="mt-1 text-sm text-slate">Một số bản ghi chưa nhận được kết quả chấm phát âm.</p>}
              <SpeakingErrorTable assessments={speakingAssessments} />
            </div>
          )}
          {!savingScore && result.ungradedCount > 0 && <p className="hsk-notice">{result.ungradedCount} câu cần chấm thủ công hoặc chưa có đáp án tự chấm.</p>}
          <p className="text-xs leading-5 text-slate">Đã làm {workedQuestionIds.size}/{questions.length} câu. {savedScore ? "Điểm đã được lưu vào phần tổng hợp theo tài khoản." : "Kết quả hiện có trên trang; bạn có thể tải bản sao về thiết bị."}</p>
        </section>
      )}

      <div id="practice-attempt-questions" hidden={!showQuestions} className={showQuestions ? "flex min-w-0 flex-col gap-6" : "hidden"}>
      {questionSections.map(({ skill, passages, audioGroups }) => {
        return (
          <section key={skill} className="flex min-w-0 flex-col gap-4">
            <h2 className="font-display text-lg font-semibold text-ink">{SKILL_LABELS[skill]}</h2>
            {passages.map(({ id: passageid, passage, audioGroups: passageAudio }) => {
              return (
                <div key={passageid} className="flex min-w-0 flex-col gap-5">
                  {passage?.passage_text?.trim() && (
                    <div className="rounded-lg border border-mist bg-surface p-4 text-sm leading-7 text-slate sm:p-5">
                      {passage.title && <h3 className="mb-2 font-semibold text-ink">{passage.title}</h3>}
                      <p className="whitespace-pre-line">{passage.passage_text}</p>
                    </div>
                  )}
                  <div className="flex min-w-0 flex-col gap-5">{renderAudioQuestions(passageAudio)}</div>
                </div>
              );
            })}
            {renderAudioQuestions(audioGroups)}
          </section>
        );
      })}
      </div>

      {notice && <p role="status" className="hsk-notice">{notice}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="hsk-button-secondary" onClick={downloadBackup}>Tải bài tự luyện của tôi</button>
      </div>
      {hasSpeakingWorkInProgress && <p className="text-xs text-slate" role="status">Hoàn tất ghi âm và nhận diện giọng nói để nộp bài.</p>}
        </div>
        {showQuestions && <Attempt.Navigator groups={navigationGroups} activeId={activeQuestionId} answeredCount={workedQuestionIds.size}
          totalCount={questions.length} markedCount={markedCount} reviewMode={Boolean(result) || gradingMode === "per-question"}
          open={questionMenuOpen} onOpenChange={setQuestionMenuOpen} onSelect={selectQuestion} />}
      </div>
    </form> : <section className="hsk-panel flex flex-col items-start gap-3">
      <h2 className="hsk-section-title">Chọn cách làm bài để bắt đầu</h2>
      <p className="text-sm leading-6 text-slate">Chọn chấm khi nộp bài hoặc nhận kết quả ngay từng câu. Đồng hồ chỉ bắt đầu sau khi bạn xác nhận.</p>
      <button type="button" className="hsk-button" onClick={() => setModeDialogOpen(true)}>Chọn cách làm bài</button>
    </section>}
    <ConfirmationDialog open={modeDialogOpen} title="Chọn cách làm bài" confirmLabel="Bắt đầu làm bài" cancelLabel="Huỷ"
      confirmDisabled={savingScore || hasUnpersistedResult} onCancel={() => setModeDialogOpen(false)} onConfirm={startAttempt}
      icon={<ClipboardCheck size={20} className="mt-0.5 shrink-0 text-brand dark:text-ink" aria-hidden="true" />}>
      <GradingModeOptions value={pendingMode} onChange={setPendingMode} />
    </ConfirmationDialog>
    <ConfirmationDialog open={confirmation !== null}
      title={confirmation === "leave" ? "Thoát bài đang làm?" : "Xác nhận nộp bài?"}
      confirmLabel={confirmation === "leave" ? "Thoát bài" : "Nộp bài"}
      confirmDisabled={confirmation === "submit" && hasSpeakingWorkInProgress}
      onCancel={closeConfirmation} onConfirm={confirmAction}>
      {confirmation === "leave" ? (
        <p>{hasUnpersistedResult
          ? "Kết quả bài làm chưa được lưu thành công. Hãy ở lại để hoàn tất lưu hoặc thử lại; nếu thoát, bạn có thể mất kết quả của lượt này."
          : "Bạn chưa nộp bài. Nếu thoát, câu trả lời, nét viết và bản ghi chưa lưu trong lượt này sẽ bị mất."}</p>
      ) : (
        <>
          <p>Đã hoàn thành <strong className="text-brand">{completedQuestionCount}/{questions.length}</strong> câu.</p>
          {unfinishedCount > 0 ? <p className="mt-2">Bạn còn <strong className="text-brand">{unfinishedCount} câu</strong> chưa hoàn thành{speakingQuestionCount > 0 ? " hoặc chưa có kết quả chấm" : ""}. Bạn vẫn muốn nộp bài?</p>
            : <p className="mt-2">Bạn có muốn nộp bài để xem kết quả không?</p>}
        </>
      )}
    </ConfirmationDialog>
    </>
  );
}

const QuestionBlock = memo(function QuestionBlock({ number, question, options, answer, onAnswerChange, onHandwritingProgress, onStrokeProgress, strokeStats,
  speechAssessment, onSpeakingAssessmentChange, onSpeakingBusyChange, onRecordingChange, recordingLocked, sampleAudioDisabled, showIndividualAudio, grade, bookmarked, onToggleBookmark, submitted, persistScores, attemptContext, gradingMode, answerLocked, canCheckImmediately, onCheckAnswer, showTextErrors }: {
  number: number;
  question: Question;
  options: Option[];
  answer: string;
  onAnswerChange: (answer: string) => void;
  onHandwritingProgress: (progress: HandwritingProgress) => void;
  onStrokeProgress: (progress: HandwritingStrokeProgress) => void;
  strokeStats?: HandwritingStrokeProgress;
  gradingMode: GradingMode;
  answerLocked: boolean;
  canCheckImmediately: boolean;
  showTextErrors?: boolean;
  onCheckAnswer: () => void;
  speechAssessment: PronunciationAssessment | null;
  onSpeakingAssessmentChange: (assessment: PronunciationAssessment | null) => void;
  onSpeakingBusyChange: (busy: boolean) => void;
  onRecordingChange: (recorded: boolean) => void;
  recordingLocked: boolean;
  sampleAudioDisabled: boolean;
  showIndividualAudio: boolean;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  grade?: PracticeScore["questions"][number];
  submitted: boolean;
  persistScores: boolean;
  attemptContext?: LearningAttemptContext;
}) {
  const [sampleAudioError, setSampleAudioError] = useState("");
  const [answerTouched, setAnswerTouched] = useState(false);
  const [composing, setComposing] = useState(false);
  const answerItem = { question, options };
  const expectsChinese = expectsChineseAnswer(answerItem);
  const answerError = textAnswerError(answerItem, answer);
  const visibleAnswerError = !composing && (answerTouched || showTextErrors) ? answerError : null;
  const answerId = "practice-answer-" + question.questionid;
  const handwriting = writingPractice(question);
  const usesTextAnswer = options.length === 0 || question.type === "ESSAY";
  const hasImageChoices = options.some(option => Boolean(option.image_url));
  const choiceColumns = hasImageChoices && options.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  const correctAnswerText = grade?.correctAnswers.map(expected => {
    const option = options.find(item => optionMatchesAnswer({ id: item.optionid, text: item.option_text }, expected, question.type));
    return option ? option.optionid + ". " + optionDisplayText(option.option_text) : expected;
  }).join(" / ");
  const feedback = grade?.status === "correct" ? { text: "Chính xác", style: "border-success bg-success-soft text-success" }
    : grade?.status === "incorrect" ? { text: "Chưa chính xác. Đáp án: " + correctAnswerText, style: "border-danger bg-danger-soft text-danger" }
      : grade?.status === "unanswered" ? { text: "Chưa trả lời. Đáp án: " + correctAnswerText, style: "border-brand/20 bg-brand/5 text-brand" }
        : grade?.status === "ungraded" && !handwriting && question.skill !== "Speaking"
          ? { text: "Câu này cần chấm thủ công hoặc chưa có đáp án tự chấm.", style: "border-mist bg-paper text-slate" } : null;

  return (
    <article id={"practice-question-" + question.questionid} data-practice-question={question.questionid}
      className="min-w-0 scroll-mt-[calc(5.5rem+var(--practice-toolbar-height,4.5rem)+1rem)] scroll-mb-[calc(var(--practice-shared-audio-height,0px)+1.5rem)] rounded-lg border border-mist bg-surface p-4 focus:outline-none sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-brand">Câu {number}</p>
        <button type="button" aria-label={bookmarked ? "Bỏ đánh dấu câu " + number : "Đánh dấu câu " + number + " để xem lại"}
          title={bookmarked ? "Bỏ đánh dấu" : "Đánh dấu để xem lại"} aria-pressed={bookmarked} onClick={onToggleBookmark}
          className={"inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand " +
            (bookmarked ? "bg-warning-soft text-warning" : "text-slate hover:bg-brand/5 hover:text-brand")}>
          <Flag size={18} fill={bookmarked ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>
      {question.skill === "Speaking" ? (
        <div className="mb-3 text-center">
          {question.question !== question.speechText && <p className="mb-3 text-sm leading-6 text-slate">{question.question}</p>}
          {question.speechText && (
            <div className="inline-flex max-w-full items-center justify-center gap-2 align-middle">
              <p lang="zh-CN" className="min-w-0 break-words text-3xl font-medium leading-relaxed text-ink">{question.speechText}</p>
              {question.audio_url && <PronunciationButton src={publicMedia(question.audio_url) || question.audio_url}
                disabled={sampleAudioDisabled} onErrorChange={setSampleAudioError} />}
            </div>
          )}
          {sampleAudioError && <p className="mt-2 text-xs leading-5 text-danger" role="alert">{sampleAudioError}</p>}
        </div>
      ) : <p className="mb-3 whitespace-pre-line text-sm font-medium leading-7 text-ink">{question.question}</p>}
      {question.pinyin && <p lang="zh-Latn" className={"mb-2 text-sm text-slate " + (question.skill === "Speaking" ? "text-center" : "")}>{question.pinyin}</p>}
      {question.translation && <p className={"mb-3 text-sm text-slate-soft " + (question.skill === "Speaking" ? "text-center" : "")}>{question.translation}</p>}
      {[
        { src: question.context_image_url }, { src: question.image_url, region: question.image_region }, { src: question.continuation_image_url },
      ].filter(item => item.src).map((item, index) => (
        <QuestionImage key={index} src={publicMedia(item.src)} region={item.region} alt="Hình minh họa câu hỏi" className="mx-auto mb-4 h-auto max-w-full rounded-lg" />
      ))}
      {showIndividualAudio && question.audio_url && !handwriting && question.skill !== "Speaking" && <audio controls preload="none" src={publicMedia(question.audio_url) || undefined} className="mb-3 w-full" onPlay={event => pauseOtherPracticeAudio(event.currentTarget)} />}
      {question.skill === "Speaking" ? (
        <SpeakingRecorder questionId={persistScores ? question.questionid : undefined} attemptContext={attemptContext} referenceText={question.speechText || ""} assessment={speechAssessment} disabled={submitted}
          locked={recordingLocked} onAssessmentChange={onSpeakingAssessmentChange} onBusyChange={onSpeakingBusyChange}
          onRecordingChange={onRecordingChange} />
      ) : handwriting ? (
        handwriting.text ? (
          <fieldset disabled={submitted} className={"mt-4 min-w-0 " + (submitted ? "pointer-events-none" : "")}>
            <legend className="sr-only">Luyện nét chữ</legend>
            <p className="mb-4 text-sm leading-6 text-slate">Viết từng nét bằng chuột hoặc cảm ứng. Bấm “Xem mẫu” để xem thứ tự nét, rồi luyện lần lượt từng chữ.</p>
            <HanziPractice text={handwriting.text} onProgress={onHandwritingProgress} onStrokeProgress={onStrokeProgress} />
          </fieldset>
        ) : <p className="hsk-notice">Câu luyện nét này chưa có chữ mẫu dạng văn bản. Hãy đối chiếu ảnh đề hoặc chọn câu khác.</p>
      ) : usesTextAnswer ? (
        <>
          {options.length > 0 && <p className="mb-3 rounded-lg bg-paper p-3 text-sm text-slate">Từ gợi ý: {options.map(item => item.option_text).join(" · ")}</p>}
          <textarea id={answerId} rows={6} aria-label={expectsChinese ? "Câu trả lời bằng tiếng Trung" : "Câu trả lời"}
            aria-invalid={Boolean(visibleAnswerError)} aria-describedby={visibleAnswerError ? answerId + "-error" : undefined}
            className={"hsk-input min-h-32" + (visibleAnswerError ? " border-danger" : "")} lang={expectsChinese ? "zh-CN" : undefined} disabled={answerLocked}
            value={answer} onChange={event => onAnswerChange(event.target.value)} onBlur={() => setAnswerTouched(true)}
            onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}
            placeholder={expectsChinese ? "Nhập câu trả lời bằng chữ Hán…" : "Nhập câu trả lời theo yêu cầu…"} />
          {visibleAnswerError && <p id={answerId + "-error"} role="alert" className="mt-2 text-sm leading-6 text-danger">{visibleAnswerError}</p>}
        </>
      ) : (
        <div className={"mt-4 grid gap-3 " + choiceColumns}>
          {options.map(option => {
            const selected = answer === option.optionid;
            const correct = grade?.correctAnswers.some(expected => optionMatchesAnswer({ id: option.optionid, text: option.option_text }, expected, question.type));
            const color = correct ? "border-success bg-success-soft" : grade?.status === "incorrect" && selected
              ? "border-danger bg-danger-soft" : selected ? "border-brand bg-brand/5" : "border-mist hover:border-brand/40 hover:bg-brand/5";
            const optionText = option.option_text.trim() === option.optionid ? "" : optionDisplayText(option.option_text);
            return (
              <label key={option.optionid} className={"flex min-w-0 cursor-pointer flex-col gap-3 rounded-lg border p-4 text-sm leading-6 text-ink transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/30 " + color}>
                <span className="flex w-full items-start gap-3">
                  <input type="radio" name={question.questionid} value={option.optionid} checked={selected} disabled={answerLocked}
                    className="mt-1 h-4 w-4 shrink-0 accent-brand" onChange={() => onAnswerChange(option.optionid)} />
                  <span className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="w-6 shrink-0 font-semibold text-brand">{option.optionid}.</span>
                    {optionText && <span className="min-w-0 flex-1 whitespace-pre-line break-words">{optionText}</span>}
                  </span>
                </span>
                {option.image_url && <span className="flex min-h-32 w-full flex-1 items-center justify-center">
                  <img src={publicMedia(option.image_url) || undefined} alt={"Đáp án " + option.optionid}
                    className="h-auto max-h-48 w-full rounded-md object-contain" loading="lazy" />
                </span>}
              </label>
            );
          })}
        </div>
      )}
      {gradingMode === "per-question" && !submitted && !handwriting && question.skill !== "Speaking" && usesTextAnswer && canCheckImmediately && !answerLocked &&
        <div className="mt-3 flex flex-col items-start gap-2">
          <button type="button" className="hsk-button-secondary" disabled={!answer.trim() || Boolean(answerError) || composing} onClick={onCheckAnswer}>Kiểm tra câu này</button>
          <p className="text-xs leading-5 text-slate">Nhập xong rồi kiểm tra. Câu trả lời sẽ được khóa sau khi chấm.</p>
        </div>}
      {gradingMode === "per-question" && !submitted && !handwriting && question.skill !== "Speaking" && !canCheckImmediately &&
        <p className="mt-3 text-xs leading-5 text-slate">Câu này chưa có đáp án chấm ngay hoặc cần chấm thủ công. Câu trả lời vẫn được gửi khi nộp bài.</p>}
      {submitted && handwriting && <p className="mt-3 rounded-lg bg-brand/5 p-3 text-sm text-slate">
        {strokeStats?.totalStrokes ? "Viết đúng " + strokeStats.correctStrokes + "/" + strokeStats.totalStrokes + " nét đã mở · " + strokeStats.mistakes + " lượt nét cần cải thiện." : "Chưa có nét viết được ghi nhận."}
      </p>}
      {feedback && <p role="status" className={"mt-3 rounded-lg border px-3 py-2 text-sm " + feedback.style}>{feedback.text}</p>}
    </article>
  );
});

type ConnectedProps = Pick<ComponentProps<typeof QuestionBlock>, "number" | "question" | "options" | "recordingLocked" | "sampleAudioDisabled" | "showIndividualAudio" | "grade" | "submitted" | "persistScores" | "attemptContext" | "gradingMode" | "showTextErrors">;
const ConnectedQuestion = memo(function ConnectedQuestion(props: ConnectedProps) {
  const store = useAttemptStore();
  const id = props.question.questionid;
  const answer = useStore(store,s => s.answers[id] || "");
  const bookmarked = useStore(store,s => Boolean(s.bookmarks[id]));
  const strokes = useStore(store,s => s.strokeStats[id]);
  const speech = useStore(store,s => s.speakingAssessments[id] ?? null);
  const checkedGrade = useStore(store, state => state.checkedQuestions[id]);
  const canCheckImmediately = props.question.skill !== "Speaking" && !writingPractice(props.question)
    && !props.question.manualGrading && Boolean(props.question.acceptedAnswers?.length);
  const usesTextAnswer = props.options.length === 0 || props.question.type === "ESSAY";
  const checkAnswer = useCallback((value: string) => {
    const state = store.getState();
    if (props.gradingMode !== "per-question" || !canCheckImmediately || !value.trim() || textAnswerError({ question: props.question, options: props.options }, value) || state.result || state.checkedQuestions[id]) return;
    const grade = scorePracticeAttempt([{ question: props.question, options: props.options }], { [id]: value }).questions[0];
    if (grade && (grade.status === "correct" || grade.status === "incorrect")) state.setField("checkedQuestions", previous => ({ ...previous, [id]: grade }));
  }, [store, id, props.gradingMode, props.question, props.options, canCheckImmediately]);
  const onAnswerChange = useCallback((value: string) => {
    const state = store.getState();
    if (state.result || state.checkedQuestions[id]) return;
    state.setField("answers", previous => ({ ...previous, [id]: value }));
    if (!usesTextAnswer) checkAnswer(value);
  }, [store, id, usesTextAnswer, checkAnswer]);
  const onCheckAnswer = useCallback(() => checkAnswer(store.getState().answers[id] || ""), [store, id, checkAnswer]);
  const onToggleBookmark = useCallback(() => store.getState().setField("bookmarks", p => ({...p,[id]:!p[id]})),[store,id]);
  const onStrokeProgress = useCallback((value: HandwritingStrokeProgress) => {
    if (store.getState().result) return;
    store.getState().setField("strokeStats", p => sameHandwritingStrokes(p[id],value) ? p : {...p,[id]:value});
  },[store,id]);
  const onHandwritingProgress = useCallback((value: HandwritingProgress) => {
    if (store.getState().result) return;
    store.getState().setField("handwriting", p => {
      const old=p[id];
      return old?.text === value.text && old.totalCharacters === value.totalCharacters && old.completedPositions.length === value.completedPositions.length && old.completedPositions.every((x,i)=>x===value.completedPositions[i]) ? p : {...p,[id]:value};
    });
  },[store,id]);
  const onSpeakingAssessmentChange = useCallback((value: PronunciationAssessment | null) => store.getState().setField("speakingAssessments",p=>{
    const next={...p};if(value) next[id]=value;else delete next[id];return next;
  }),[store,id]);
  const onSpeakingBusyChange = useCallback((value: boolean) => store.getState().setField("speakingBusy",p=>({...p,[id]:value})),[store,id]);
  const onRecordingChange = useCallback((value: boolean) => store.getState().setField("recordedQuestions",p=>({...p,[id]:value})),[store,id]);
  return <QuestionBlock {...props} answer={answer} bookmarked={bookmarked} strokeStats={strokes} speechAssessment={speech}
    gradingMode={props.gradingMode} answerLocked={props.submitted || Boolean(checkedGrade)} canCheckImmediately={canCheckImmediately} onCheckAnswer={onCheckAnswer}
    onAnswerChange={onAnswerChange} onToggleBookmark={onToggleBookmark} onStrokeProgress={onStrokeProgress}
    onHandwritingProgress={onHandwritingProgress} onSpeakingAssessmentChange={onSpeakingAssessmentChange}
    onSpeakingBusyChange={onSpeakingBusyChange} onRecordingChange={onRecordingChange} />;
});
function AttemptTimer({duration,deadline,version,stopped,blocked,onExpire}: {duration:number;deadline:number;version:number;stopped:boolean;blocked:boolean;onExpire:()=>void}) {
  const [seconds,setSeconds]=useState(()=>remainingExamSeconds(deadline));
  const expired=useRef(false);const callback=useRef(onExpire);callback.current=onExpire;
  useEffect(()=>{expired.current=false;},[version]);
  useEffect(()=>{
    if(duration<=0 || stopped) return;
    const sync=()=>setSeconds(remainingExamSeconds(deadline));sync();
    const timer=setInterval(sync,1000);window.addEventListener("focus",sync);document.addEventListener("visibilitychange",sync);
    return ()=>{clearInterval(timer);window.removeEventListener("focus",sync);document.removeEventListener("visibilitychange",sync);};
  },[deadline,duration,stopped,version]);
  useEffect(()=>{if(duration>0 && seconds<=0 && remainingExamSeconds(deadline)<=0 && !stopped && !blocked && !expired.current){expired.current=true;callback.current();}},[seconds,deadline,duration,stopped,blocked,version]);
  return <p className={"mt-0.5 text-xs " + (seconds<=60 && duration>0 && !stopped ? "font-semibold text-danger" : "text-slate")}>
    {stopped ? "\u0110\u00e3 n\u1ed9p b\u00e0i" : duration>0 ? "C\u00f2n l\u1ea1i " + String(Math.floor(seconds/60)).padStart(2,"0") + ":" + String(seconds%60).padStart(2,"0") : "T\u1ef1 luy\u1ec7n"}
  </p>;
}
function AttemptNavigator(props: ComponentProps<typeof QuestionNavigator>) {
  const store=useAttemptStore();const activeId=useStore(store,s=>s.activeQuestionId);
  return <QuestionNavigator {...props} activeId={activeId} />;
}
/** Compound API reuses the existing form, navigator and question renderer. */
export const Attempt = {Root:AttemptRoot,Question:ConnectedQuestion,Navigator:AttemptNavigator,Timer:AttemptTimer};
