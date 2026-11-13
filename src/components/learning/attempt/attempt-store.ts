import { createStore } from "zustand/vanilla";
import type { SetStateAction } from "react";
import type { PronunciationAssessment } from "@/lib/api/types";
import type { HandwritingProgress, HandwritingStrokeProgress } from "@/lib/writing-practice";
import type { PracticeScore } from "@/lib/practice-scoring";
import type { SubmittedLearningScore, LearningScoreSubmission } from "@/lib/learning-scores";

export type SubmitPhase = "doing" | "confirming" | "saving" | "saveFailed" | "saved" | "reviewing";
export interface AttemptValues {
  answers: Record<string,string>;
  handwriting: Record<string,HandwritingProgress>;
  strokeStats: Record<string,HandwritingStrokeProgress>;
  speakingAssessments: Record<string,PronunciationAssessment>;
  recordedQuestions: Record<string,boolean>;
  speakingBusy: Record<string,boolean>;
  bookmarks: Record<string,boolean>;
  activeQuestionId: string | null;
  result: PracticeScore | null;
  savedScore: SubmittedLearningScore | null;
}
export interface AttemptState extends AttemptValues {
  phase: SubmitPhase;
  error: string;
  submission: LearningScoreSubmission | null;
  setField: <K extends keyof AttemptValues>(key: K, value: SetStateAction<AttemptValues[K]>) => void;
  confirm: () => void;
  cancelConfirm: () => void;
  claim: (payload: LearningScoreSubmission) => boolean;
  complete: (result: SubmittedLearningScore) => void;
  fail: (message: string) => void;
  review: (value: boolean | ((previous: boolean) => boolean)) => void;
  reset: () => void;
}
export function createAttemptStore(firstQuestion: string | null = null) {
  const initial = (): AttemptValues => ({ answers:{}, handwriting:{}, strokeStats:{}, speakingAssessments:{}, recordedQuestions:{}, speakingBusy:{}, bookmarks:{}, activeQuestionId:firstQuestion, result:null, savedScore:null });
  return createStore<AttemptState>()((set,get) => ({
    ...initial(), phase:"doing", error:"", submission:null,
    setField: (key,value) => {
      const previous = get()[key];
      const next = typeof value === "function" ? (value as (p: typeof previous) => typeof previous)(previous) : value;
      if (next !== previous) set({ [key]:next } as Pick<AttemptState, typeof key>);
    },
    confirm: () => { if (get().phase === "doing") set({phase:"confirming"}); },
    cancelConfirm: () => { if (get().phase === "confirming") set({phase:"doing"}); },
    claim: payload => {
      const state = get();
      if (!["doing","confirming","saveFailed"].includes(state.phase)) return false;
      if (state.phase === "saveFailed" && state.submission !== payload) return false;
      set({phase:"saving",error:"",submission:payload}); return true;
    },
    complete: result => { if (get().phase === "saving") set({phase:"saved",savedScore:result,result,error:""}); },
    fail: error => { if (get().phase === "saving") set({phase:"saveFailed",error}); },
    review: value => {
      const state=get(); if (!state.result || state.phase === "saving") return;
      const next = typeof value === "function" ? value(state.phase === "reviewing") : value;
      set({phase:next ? "reviewing" : state.submission && !state.savedScore ? "saveFailed" : "saved"});
    },
    reset: () => { if (get().phase !== "saving") set({...initial(),phase:"doing",error:"",submission:null}); },
  }));
}
export type AttemptStore = ReturnType<typeof createAttemptStore>;
