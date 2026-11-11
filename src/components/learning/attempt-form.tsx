"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { SubmittedLearningScore, LearningScoreSubmission, LearningAttemptContext } from "@/lib/learning-scores";
import { historyHref, historyResultHref } from "@/lib/learning-history";
import { Flag, LayoutGrid } from "lucide-react";
import { SKILL_LABELS } from "@/lib/hsk";
import type { TestWithQuestions, Skill, Question } from "@/types/assessment";
import type { PronunciationAssessment } from "@/lib/api/types";
import { publicMedia } from "@/lib/api/config";
import { HanziPractice } from "@/components/learning/hanzi-practice";
import { SpeakingRecorder } from "@/components/learning/speaking-recorder";
import { PronunciationButton } from "@/components/learning/pronunciation-button";
import { SharedAudioSection } from "@/components/learning/shared-audio-section";
import { groupPracticeAudio, pauseOtherPracticeAudio } from "@/lib/practice-audio";
import { QuestionNavigator, type QuestionNavigationGroup } from "@/components/learning/question-navigator";
import { writingPractice, sameHandwritingStrokes, type HandwritingProgress, type HandwritingStrokeProgress } from "@/lib/writing-practice";
import { scorePracticeAttempt, type PracticeScore } from "@/lib/practice-scoring";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useBlockNavigation } from "@/components/shell/navigation-protection";
import { promotionMessage } from "@/lib/hsk-promotion";

function RefreshProfileAfterPromotion() {
  const router = useRouter();
  useEffect(() => { router.refresh(); }, [router]);
  return null;
}

type Option = { optionid: string; option_text: string; image_url?: string | null };

export function AttemptForm({ attemptid, testid, data, recordScores = false }: {
  attemptid: string;
  testid: string;
  data: TestWithQuestions;
  recordScores?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [handwriting, setHandwriting] = useState<Record<string, HandwritingProgress>>({});
  const [strokeStats, setStrokeStats] = useState<Record<string, HandwritingStrokeProgress>>({});
  const [speakingAssessments, setSpeakingAssessments] = useState<Record<string, PronunciationAssessment>>({});
  const [recordedQuestions, setRecordedQuestions] = useState<Record<string, boolean>>({});
  const [speakingBusy, setSpeakingBusy] = useState<Record<string, boolean>>({});
  const [attemptVersion, setAttemptVersion] = useState(0);
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [questionMenuOpen, setQuestionMenuOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<"leave" | "submit" | null>(null);
  const pendingLeave = useRef<(() => void) | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(() => Object.values(data.questionsBySkill).flatMap(items => items || [])[0]?.question.questionid ?? null);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<PracticeScore | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const showQuestions = !result || reviewing;
  const [savedScore, setSavedScore] = useState<SubmittedLearningScore | null>(null);
  const [savingScore, setSavingScore] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const scoreBusy = useRef(false);
  const scorePayload = useRef<LearningScoreSubmission | null>(null);
  const scoreAttemptId = useRef(globalThis.crypto?.randomUUID?.() || "attempt-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2));
  const attemptStartedAt = useRef(Date.now());
  const sourceReference = /^(exam|set)-(\d+)$/.exec(testid);
  const attemptContext: LearningAttemptContext | undefined = recordScores && sourceReference
    ? { attemptId: scoreAttemptId.current, kind: sourceReference[1] as "exam" | "set", sourceId: Number(sourceReference[2]) } : undefined;
  const isExam = /^exam-/.test(testid);

  const [secondsLeft, setSecondsLeft] = useState(data.test.duration * 60);
  const formRef = useRef<HTMLFormElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const autoSubmitted = useRef(false);
  const activeSpeaking = useRef(new Set<string>());
  const keepSelectedQuestion = useRef(false);

  const questions = useMemo(() => Object.values(data.questionsBySkill).flatMap(items => items || []), [data.questionsBySkill]);
  const hasSpeakingWorkInProgress = Object.values(speakingBusy).some(Boolean);

  useEffect(() => {
    if (data.test.duration <= 0 || result) return;
    if (secondsLeft <= 0) {
      if (!hasSpeakingWorkInProgress && !autoSubmitted.current) {
        autoSubmitted.current = true;
        formRef.current?.requestSubmit();
      }
      return;
    }
    const timer = setTimeout(() => setSecondsLeft(current => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [data.test.duration, result, secondsLeft, hasSpeakingWorkInProgress]);

  useEffect(() => {
    if (result) {
      resultRef.current?.focus({ preventScroll: true });
      resultRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  useEffect(() => {
    if (!showQuestions || typeof IntersectionObserver === "undefined") return;
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
  }, [questions, attemptVersion, showQuestions]);

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
  }, []);

  const toggleBookmark = useCallback((questionId: string) => {
    setBookmarks(previous => ({ ...previous, [questionId]: !previous[questionId] }));
  }, []);

  const updateStrokeProgress = useCallback((questionId: string, progress: HandwritingStrokeProgress) => {
    if (result) return;
    setStrokeStats(previous => sameHandwritingStrokes(previous[questionId], progress)
      ? previous : { ...previous, [questionId]: progress });
  }, [result]);

  const updateHandwritingProgress = useCallback((questionId: string, progress: HandwritingProgress) => {
    if (result) return;
    setHandwriting(previous => {
      const current = previous[questionId];
      if (current?.text === progress.text
        && current.totalCharacters === progress.totalCharacters
        && current.completedPositions.length === progress.completedPositions.length
        && current.completedPositions.every((position, index) => position === progress.completedPositions[index])) return previous;
      return { ...previous, [questionId]: progress };
    });
  }, [result]);

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
  }, []);

  const updateSpeakingAssessment = useCallback((questionId: string, assessment: PronunciationAssessment | null) => {
    setSpeakingAssessments(previous => {
      const next = { ...previous };
      if (assessment) next[questionId] = assessment;
      else delete next[questionId];
      return next;
    });
  }, []);

  const updateSpeakingBusy = useCallback((questionId: string, busy: boolean) => {
    if (busy) activeSpeaking.current.add(questionId);
    else activeSpeaking.current.delete(questionId);
    setSpeakingBusy(previous => ({ ...previous, [questionId]: busy }));
  }, []);

  const updateRecordedQuestion = useCallback((questionId: string, recorded: boolean) => {
    setRecordedQuestions(previous => ({ ...previous, [questionId]: recorded }));
  }, []);

  const strokeSummary = Object.values(strokeStats).reduce((summary, item) => ({
    correctStrokes: summary.correctStrokes + item.correctStrokes,
    totalStrokes: summary.totalStrokes + item.totalStrokes,
    mistakes: summary.mistakes + item.mistakes,
  }), { correctStrokes: 0, totalStrokes: 0, mistakes: 0 });
  const tracingQuestions = questions.filter(item => writingPractice(item.question) !== null);
  const writingCompleted = Object.values(handwriting).reduce((sum, item) => sum + item.completedPositions.length, 0);
  const writingTotal = Object.values(handwriting).reduce((sum, item) => sum + item.totalCharacters, 0);
  const speakingQuestionCount = questions.filter(item => item.question.skill === "Speaking").length;
  const speakingValues = Object.values(speakingAssessments);
  const recordingCount = Object.values(recordedQuestions).filter(Boolean).length;
  const speakingAverage = speakingValues.length
    ? Math.round(speakingValues.reduce((sum, item) => sum + item.score, 0) / speakingValues.length * 10) / 10
    : null;
  const workedQuestionIds = new Set([
    ...Object.entries(answers).filter(([, answer]) => Boolean(answer.trim())).map(([id]) => id),
    ...Object.entries(strokeStats).filter(([, progress]) => progress.correctStrokes > 0 || progress.mistakes > 0).map(([id]) => id),
    ...Object.entries(handwriting).filter(([, progress]) => progress.completedPositions.length > 0).map(([id]) => id),
    ...Object.entries(recordedQuestions).filter(([, recorded]) => recorded).map(([id]) => id),
  ]);
  const gradeByQuestion = new Map((savingScore ? [] : result?.questions || []).map(grade => [grade.questionId, grade] as const));
  const questionNumbers = new Map(questions.map((item, index) => [item.question.questionid, index + 1]));

  const markedCount = Object.values(bookmarks).filter(Boolean).length;
  const completedQuestionCount = questions.filter(({ question }) => {
    if (question.skill === "Speaking") return Boolean(speakingAssessments[question.questionid]);
    if (writingPractice(question)) {
      const progress = handwriting[question.questionid];
      return Boolean(progress && progress.totalCharacters > 0 && progress.completedPositions.length >= progress.totalCharacters);
    }
    return Boolean(answers[question.questionid]?.trim());
  }).length;
  const unfinishedCount = questions.length - completedQuestionCount;
  const hasUnpersistedResult = Boolean(result && recordScores && scorePayload.current && !savedScore);
  const hasUnsavedChanges = hasUnpersistedResult || (!result && (workedQuestionIds.size > 0 || hasSpeakingWorkInProgress
    || markedCount > 0 || speakingValues.length > 0
    || (data.test.duration > 0 && secondsLeft < data.test.duration * 60)));

  useBlockNavigation(hasUnsavedChanges, proceed => {
    pendingLeave.current = proceed;
    setQuestionMenuOpen(false);
    setConfirmation("leave");
  });

  function closeConfirmation() {
    pendingLeave.current = null;
    setConfirmation(null);
  }

  async function persistScore(payload: LearningScoreSubmission) {
    if (scoreBusy.current) return;
    scoreBusy.current = true; setSavingScore(true); setScoreError("");
    try {
      const saved = await apiFetch<SubmittedLearningScore>("learning-scores/submit", { method: "POST", body: JSON.stringify(payload) });
      setSavedScore(saved); setResult(saved);
      setNotice(saved.historyId ? "Đã lưu bài làm vào lịch sử theo tài khoản." : "Đã cập nhật điểm tổng hợp theo tài khoản.");
      window.dispatchEvent(new Event("hsk-scores-updated"));
    } catch (cause) {
      setScoreError(cause instanceof ApiError && cause.status === 404 ? "Backend chưa được cập nhật chức năng tính điểm này. Câu trả lời vẫn còn trên trang để thử lại."
        : cause instanceof Error ? cause.message : "Chưa lưu được kết quả. Hãy thử lại.");
    } finally { scoreBusy.current = false; setSavingScore(false); }
  }

  function finishAttempt() {
    if (result || scoreBusy.current || activeSpeaking.current.size) return;
    closeConfirmation();
    formRef.current?.querySelectorAll("audio").forEach(audio => audio.pause());
    setReviewing(false);
    setNotice("");
    const separatelyTracked = new Set(questions
      .filter(item => item.question.skill === "Speaking" || writingPractice(item.question) !== null)
      .map(item => item.question.questionid));
    setResult(scorePracticeAttempt(questions, answers, separatelyTracked));
    const reference = /^(exam|set)-(\d+)$/.exec(testid);
    if (recordScores && reference) {
      const payload: LearningScoreSubmission = { attemptId: scoreAttemptId.current, kind: reference[1] as "exam" | "set", sourceId: Number(reference[2]), answers,
        startedAt: new Date(attemptStartedAt.current).toISOString(), durationSeconds: Math.min(604800, Math.max(0, Math.floor((Date.now() - attemptStartedAt.current) / 1000))),
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
    setSavedScore(null); setScoreError(""); scorePayload.current = null;
    scoreAttemptId.current = globalThis.crypto?.randomUUID?.() || "attempt-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    attemptStartedAt.current = Date.now();
    setAnswers({});
    setHandwriting({});
    setStrokeStats({});
    setSpeakingAssessments({});
    setRecordedQuestions({});
    setSpeakingBusy({});
    setBookmarks({});
    setQuestionMenuOpen(false);
    keepSelectedQuestion.current = false;
    setActiveQuestionId(questions[0]?.question.questionid ?? null);
    activeSpeaking.current.clear();
    setAttemptVersion(version => version + 1);
    setNotice("");
    setResult(null);
    setReviewing(false);
    setSecondsLeft(data.test.duration * 60);
    autoSubmitted.current = false;
  }

  function renderQuestion({ question, options }: { question: Question; options: Option[] }, showIndividualAudio = true) {
    return (
      <QuestionBlock
        key={question.questionid + "-" + attemptVersion}
        number={questionNumbers.get(question.questionid) || 1}
        question={question}
        options={options}
        answer={answers[question.questionid] || ""}
        onAnswerChange={answer => setAnswers(previous => ({ ...previous, [question.questionid]: answer }))}
        onHandwritingProgress={progress => updateHandwritingProgress(question.questionid, progress)}
        onStrokeProgress={progress => updateStrokeProgress(question.questionid, progress)}
        strokeStats={strokeStats[question.questionid]}
        speechAssessment={speakingAssessments[question.questionid] ?? null}
        onSpeakingAssessmentChange={assessment => updateSpeakingAssessment(question.questionid, assessment)}
        onSpeakingBusyChange={busy => updateSpeakingBusy(question.questionid, busy)}
        onRecordingChange={recorded => updateRecordedQuestion(question.questionid, recorded)}
        recordingLocked={hasSpeakingWorkInProgress && !speakingBusy[question.questionid]}
        sampleAudioDisabled={hasSpeakingWorkInProgress}
        showIndividualAudio={showIndividualAudio}
        grade={gradeByQuestion.get(question.questionid)}
        bookmarked={Boolean(bookmarks[question.questionid])}
        onToggleBookmark={() => toggleBookmark(question.questionid)}
        submitted={Boolean(result)}
        persistScores={recordScores}
        attemptContext={attemptContext}
      />
    );
  }

  function renderAudioQuestions(items: { question: Question; options: Option[] }[]) {
    return groupPracticeAudio(items, data.test.audio_url).map(group => {
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
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <>
    {recordScores && savedScore?.currentHskLevel != null && savedScore.currentHskLevel > (savedScore.previousCurrentHskLevel ?? 0) && <RefreshProfileAfterPromotion />}
    <form ref={formRef} className="flex flex-col gap-6" onSubmit={event => {
      event.preventDefault();
      if (result) return;
      if (activeSpeaking.current.size) {
        setNotice("Hãy dừng ghi âm và đợi nhận diện giọng nói xong rồi nộp bài.");
        return;
      }
      setNotice("");
      if (autoSubmitted.current && data.test.duration > 0 && secondsLeft <= 0) {
        finishAttempt();
        return;
      }
      setQuestionMenuOpen(false);
      setConfirmation("submit");
    }}>
      <input type="hidden" name="attemptid" value={attemptid} />
      <input type="hidden" name="testid" value={testid} />
      <div ref={toolbarRef} className="sticky top-[5.5rem] z-30 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-mist bg-surface px-4 py-3 shadow-card">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{workedQuestionIds.size}/{questions.length} câu đã làm</p>
          <p className={"mt-0.5 text-xs " + (secondsLeft <= 60 && data.test.duration > 0 && !result ? "font-semibold text-danger" : "text-slate")}>
            {result ? "Đã nộp bài" : data.test.duration > 0 ? mm + ":" + ss : "Tự luyện"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showQuestions && <button type="button" aria-label="Mở danh sách câu hỏi" title="Mở danh sách câu hỏi"
            aria-expanded={questionMenuOpen} aria-controls="practice-question-menu"
            onClick={() => setQuestionMenuOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-mist text-brand hover:bg-brand/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand lg:hidden">
            <LayoutGrid size={20} aria-hidden="true" />
          </button>}
          {result ? <button type="button" className="hsk-button" disabled={savingScore || hasUnpersistedResult} onClick={resetAttempt}>Làm lại</button>
            : <button type="submit" className="hsk-button" disabled={hasSpeakingWorkInProgress}>Nộp bài</button>}
        </div>
      </div>

      <div className={showQuestions ? "grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_19rem]" : "min-w-0"}>
        <div className="flex min-w-0 flex-col gap-6">


      {result && (
        <section ref={resultRef} tabIndex={-1} aria-label="Kết quả luyện tập" className="hsk-panel flex scroll-mt-24 flex-col gap-4 outline-none">
          <h2 className="font-display text-lg font-semibold text-ink">Kết quả luyện tập</h2>
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
            <p className="mt-1 text-2xl font-semibold text-brand">{savedScore.totalScore === null ? "Chưa có điểm toàn đề hợp lệ" : savedScore.totalScore.toLocaleString("vi-VN", { maximumFractionDigits: 2 }) + "/" + savedScore.maxScore}</p>
            <div className="mt-3 flex flex-wrap gap-3">{savedScore.sections.map(section => <p key={section.skill} className="text-sm text-slate">{SKILL_LABELS[section.skill]}: {section.score === null ? "Chưa chấm" : section.score.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + "/100"}{!section.complete && " · chưa đầy đủ"}</p>)}</div>
            {savedScore.passed && <p className="mt-3 text-sm font-semibold text-brand">Đạt ngưỡng của đề HSK {savedScore.hskLevel}. {promotionMessage(savedScore)}</p>}
            {savedScore.eligible && !savedScore.passed && <p className="mt-3 text-sm font-semibold text-brand">Chưa đạt ngưỡng {savedScore.passScore}/{savedScore.maxScore}. Mức HSK đã ghi nhận được giữ nguyên.</p>}
            {savedScore.reasons.length > 0 && <ul className="mt-3 list-disc pl-4 text-xs leading-6 text-slate">{savedScore.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
            <p className="mt-3 text-xs leading-5 text-slate">Đây là kết quả luyện thi nội bộ. Mức HSK không lấy từ điểm trung bình bốn kỹ năng và không tự đổi mục tiêu học tập.</p>
          </div>}
          {!savingScore && result.gradedCount > 0 && (!isExam || !savedScore) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-brand/5 p-4">
                <p className="text-xs text-slate">Điểm đối chiếu đáp án</p>
                <p className="mt-1 text-2xl font-semibold text-brand">{result.score}/100</p>
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
            </div>
          )}
          {speakingQuestionCount > 0 && (
            <div className="rounded-lg border border-mist p-4">
              <h3 className="font-semibold text-ink">Kết quả luyện nói</h3>
              <p className="mt-2 text-xl font-semibold text-brand">{speakingAverage === null ? "Chưa có điểm phát âm" : speakingAverage + "/100"}</p>
              <p className="mt-2 text-sm leading-6 text-slate">Đã ghi âm {recordingCount}/{speakingQuestionCount} câu · đã chấm {speakingValues.length} câu.</p>
              {speakingValues.length < recordingCount && <p className="mt-1 text-sm text-slate">Một số bản ghi chưa nhận được kết quả chấm phát âm.</p>}
            </div>
          )}
          {!savingScore && result.ungradedCount > 0 && <p className="hsk-notice">{result.ungradedCount} câu cần chấm thủ công hoặc chưa có đáp án tự chấm.</p>}
          <p className="text-xs leading-5 text-slate">Đã làm {workedQuestionIds.size}/{questions.length} câu. {savedScore ? "Điểm đã được lưu vào phần tổng hợp theo tài khoản." : "Kết quả hiện có trên trang; bạn có thể tải bản sao về thiết bị."}</p>
        </section>
      )}

      <div id="practice-attempt-questions" hidden={!showQuestions} className={showQuestions ? "flex min-w-0 flex-col gap-6" : "hidden"}>
      {(Object.entries(data.questionsBySkill) as [Skill, typeof data.questionsBySkill[Skill]][]).map(([skill, items]) => {
        const byPassage = new Map<string, NonNullable<typeof items>>();
        const noPassage: NonNullable<typeof items> = [];
        items?.forEach(item => {
          const passageid = item.question.passageid;
          if (passageid) {
            const list = byPassage.get(passageid) || [];
            list.push(item);
            byPassage.set(passageid, list);
          } else noPassage.push(item);
        });
        return (
          <section key={skill} className="flex min-w-0 flex-col gap-4">
            <h2 className="font-display text-lg font-semibold text-ink">{SKILL_LABELS[skill]}</h2>
            {Array.from(byPassage.entries()).map(([passageid, groupItems]) => {
              const passage = data.passages.find(item => item.passageid === passageid);
              return (
                <div key={passageid} className="flex min-w-0 flex-col gap-5">
                  {passage?.passage_text?.trim() && (
                    <div className="rounded-lg border border-mist bg-surface p-4 text-sm leading-7 text-slate sm:p-5">
                      {passage.title && <h3 className="mb-2 font-semibold text-ink">{passage.title}</h3>}
                      <p className="whitespace-pre-line">{passage.passage_text}</p>
                    </div>
                  )}
                  <div className="flex min-w-0 flex-col gap-5">{renderAudioQuestions(groupItems)}</div>
                </div>
              );
            })}
            {renderAudioQuestions(noPassage)}
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
        {showQuestions && <QuestionNavigator groups={navigationGroups} activeId={activeQuestionId} answeredCount={workedQuestionIds.size}
          totalCount={questions.length} markedCount={markedCount} reviewMode={Boolean(result)}
          open={questionMenuOpen} onOpenChange={setQuestionMenuOpen} onSelect={selectQuestion} />}
      </div>
    </form>
    <ConfirmationDialog open={confirmation !== null}
      title={confirmation === "leave" ? "Thoát bài đang làm?" : "Xác nhận nộp bài?"}
      confirmLabel={confirmation === "leave" ? "Thoát bài" : "Nộp bài"}
      confirmDisabled={confirmation === "submit" && hasSpeakingWorkInProgress}
      onCancel={closeConfirmation} onConfirm={confirmAction}>
      {confirmation === "leave" ? (
        <p>Tiến độ hiện tại chưa được lưu. Nếu thoát, câu trả lời, nét viết và bản ghi trong lượt này sẽ bị mất.</p>
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

function QuestionBlock({ number, question, options, answer, onAnswerChange, onHandwritingProgress, onStrokeProgress, strokeStats,
  speechAssessment, onSpeakingAssessmentChange, onSpeakingBusyChange, onRecordingChange, recordingLocked, sampleAudioDisabled, showIndividualAudio, grade, bookmarked, onToggleBookmark, submitted, persistScores, attemptContext }: {
  number: number;
  question: Question;
  options: Option[];
  answer: string;
  onAnswerChange: (answer: string) => void;
  onHandwritingProgress: (progress: HandwritingProgress) => void;
  onStrokeProgress: (progress: HandwritingStrokeProgress) => void;
  strokeStats?: HandwritingStrokeProgress;
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
  const handwriting = writingPractice(question);
  const usesTextAnswer = options.length === 0 || ["FILL_IN_BLANK", "SHORT_ANSWER", "ESSAY"].includes(question.type || "");
  const hasImageChoices = options.some(option => Boolean(option.image_url));
  const choiceColumns = hasImageChoices && options.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  const correctAnswerText = grade?.correctAnswers.map(expected => {
    const option = options.find(item => item.optionid.toLowerCase() === expected.toLowerCase());
    return option ? option.optionid + ". " + option.option_text : expected;
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
      {[question.context_image_url, question.image_url, question.continuation_image_url].filter(Boolean).map((src, index) => (
        <img key={index} src={publicMedia(src) || undefined} alt="Hình minh họa câu hỏi" className="mx-auto mb-4 h-auto max-w-full rounded-lg" loading="lazy" />
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
          <textarea rows={6} aria-label="Câu trả lời bằng tiếng Trung" className="hsk-input min-h-32" lang="zh-CN" disabled={submitted}
            value={answer} onChange={event => onAnswerChange(event.target.value)} placeholder="Nhập câu trả lời bằng tiếng Trung…" />
        </>
      ) : (
        <div className={"mt-4 grid gap-3 " + choiceColumns}>
          {options.map(option => {
            const selected = answer === option.optionid;
            const correct = grade?.correctAnswers.some(expected => expected.toLowerCase() === option.optionid.toLowerCase()
              || expected.toLowerCase() === option.option_text.toLowerCase());
            const color = correct ? "border-success bg-success-soft" : grade?.status === "incorrect" && selected
              ? "border-danger bg-danger-soft" : selected ? "border-brand bg-brand/5" : "border-mist hover:border-brand/40 hover:bg-brand/5";
            const optionText = option.option_text.trim() === option.optionid ? "" : option.option_text;
            return (
              <label key={option.optionid} className={"flex min-w-0 cursor-pointer flex-col gap-3 rounded-lg border p-4 text-sm leading-6 text-ink transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/30 " + color}>
                <span className="flex w-full items-start gap-3">
                  <input type="radio" name={question.questionid} value={option.optionid} checked={selected} disabled={submitted}
                    className="mt-1 h-4 w-4 shrink-0 accent-brand" onChange={() => onAnswerChange(option.optionid)} />
                  <span className="min-w-0 break-words">
                    <span className="font-semibold text-brand">{option.optionid}.</span>
                    {optionText && <span className="ml-2">{optionText}</span>}
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
      {submitted && handwriting && <p className="mt-3 rounded-lg bg-brand/5 p-3 text-sm text-slate">
        {strokeStats?.totalStrokes ? "Viết đúng " + strokeStats.correctStrokes + "/" + strokeStats.totalStrokes + " nét đã mở · " + strokeStats.mistakes + " lượt nét cần cải thiện." : "Chưa có nét viết được ghi nhận."}
      </p>}
      {feedback && <p className={"mt-3 rounded-lg border px-3 py-2 text-sm " + feedback.style}>{feedback.text}</p>}
    </article>
  );
}
