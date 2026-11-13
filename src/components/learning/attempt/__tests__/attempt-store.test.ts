import { createAttemptStore } from "../attempt-store";
import type { LearningScoreSubmission } from "@/lib/learning-scores";
const payload:LearningScoreSubmission={attemptId:"attempt-1",kind:"exam",sourceId:1,answers:{"1":"A"}};
it("isolates answers and selected question between concurrent instances",()=>{
  const a=createAttemptStore("1"),b=createAttemptStore("2");a.getState().setField("answers",{"1":"A"});
  expect(b.getState().answers).toEqual({});expect(b.getState().activeQuestionId).toBe("2");
});
it("rejects double submit and retry with a different payload",()=>{
  const s=createAttemptStore();s.getState().confirm();expect(s.getState().claim(payload)).toBe(true);
  expect(s.getState().claim(payload)).toBe(false);s.getState().fail("offline");
  expect(s.getState().claim({...payload})).toBe(false);expect(s.getState().claim(payload)).toBe(true);
});
it("does not erase an in-flight submission and resets safely after failure",()=>{
  const s=createAttemptStore();s.getState().claim(payload);s.getState().reset();expect(s.getState().phase).toBe("saving");
  s.getState().fail("offline");s.getState().reset();expect(s.getState().phase).toBe("doing");expect(s.getState().submission).toBeNull();
});
it("ignores identity-equal progress updates to prevent render loops",()=>{
  const s=createAttemptStore();const listener=jest.fn();s.subscribe(listener);
  s.getState().setField("answers",p=>p);expect(listener).not.toHaveBeenCalled();
  s.getState().setField("answers",p=>({...p,"1":"A"}));expect(listener).toHaveBeenCalledTimes(1);
});
it("returns from cancelled confirmation without submitting",()=>{
  const s=createAttemptStore();s.getState().confirm();s.getState().cancelConfirm();expect(s.getState().phase).toBe("doing");expect(s.getState().submission).toBeNull();
});
