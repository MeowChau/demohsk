import { groupPracticeSections } from "../practice-audio";
import { optionMatchesAnswer, normalizeAnswer, scorePracticeAttempt } from "../practice-scoring";
import { parseHistoryQuery,historyDuration,historyDate,historyHref } from "../learning-history";
import { resourceId,canonicalAttemptHref,attemptHref } from "../attempt-routes";
import { parseExamMinutes,remainingExamSeconds,defaultExamMinutes } from "../exam-timing";
import { promotionMessage } from "../hsk-promotion";
import { checkedInOnDate,studyDateKey } from "../daily-checkin";
import type { Question } from "@/types/assessment";
function item(id:string,type="MULTIPLE_CHOICE",acceptedAnswers=["B"]){return {question:{questionid:id,type,acceptedAnswers,skill:"Reading",marks:1,testid:"set-1",passageid:null,question:"Choose"} as Question,options:[{optionid:"B",option_text:"你好"}]};}
describe("grading and result semantics",()=>{
 it("grades option IDs, normalized text and true/false without penalizing self practice",()=>{
  const q=[item("1"),item("2","SHORT_ANSWER",["你好"]),item("3","TRUE_FALSE",["false"]),item("4","ESSAY",[])];
  const r=scorePracticeAttempt(q,{"1":"B","2":" 你好。 ","3":"B","4":"essay"});
  expect(r).toMatchObject({score:100,correctCount:3,gradedCount:3,ungradedCount:1});
 });
 it("counts blank and wrong answers while excluding recording/tracing",()=>{
  const r=scorePracticeAttempt([item("1"),item("2"),item("3")],{"1":"A"},new Set(["3"]));
  expect(r).toMatchObject({score:0,gradedCount:2,unansweredCount:1});expect(r.questions.map(x=>x.status)).toEqual(["incorrect","unanswered","ungraded"]);
  expect(scorePracticeAttempt([],{}).score).toBeNull();
 });
 it("normalizes and validates history filters and preserves them across pages",()=>{
  const q=parseHistoryQuery({page:"-1",kind:"invalid",from:"2026-02-30",to:"2026-11-13",sourceId:"2147483648",skill:"reading",hskLevel:"3",search:" abc "});
  expect(q).toMatchObject({page:1,kind:"",from:"",to:"2026-11-13",sourceId:"",skill:"READING",search:"abc"});
  expect(historyHref({...q,page:2})).toContain("page=2");
  expect(parseHistoryQuery({page:["2"],kind:"exam",sourceId:"1",hskLevel:"10",skill:"bad"})).toMatchObject({page:2,kind:"exam",sourceId:"1",hskLevel:"",skill:""});
 });
 it("formats durations and invalid dates without exposing NaN",()=>{
  expect([null,NaN,9,60,65].map(historyDuration)).toEqual(["—","—","9 giây","1 phút","1 phút 5 giây"]);expect(historyDate("bad")).toBe("—");
 });
 it("canonicalizes old attempt URLs while keeping unrelated exam settings",()=>{
  expect(resourceId("001")).toBe("1");expect(resourceId("0")).toBeNull();expect(()=>attemptHref("bad")).toThrow();
  expect(canonicalAttemptHref("/practice/attempt/exam-2",new URLSearchParams("testid=set-3&minutes=40"))).toBe("/exams/2/attempt?minutes=40");
  expect(canonicalAttemptHref("/exams/2/attempt",new URLSearchParams())).toBeNull();
  expect(canonicalAttemptHref("/practice/sets/001/attempt/",new URLSearchParams())).toBe("/practice/sets/1/attempt");
  expect(canonicalAttemptHref("/other",new URLSearchParams())).toBeNull();
 });
 it("enforces timer input limits and derives wall-clock remaining time",()=>{
  expect(["0","181","1.5"," 4","bad"].map(parseExamMinutes)).toEqual([null,null,null,null,null]);
  expect(parseExamMinutes("180")).toBe(180);expect(defaultExamMinutes(3)).toBe(90);expect(defaultExamMinutes(9)).toBe(40);
  expect(remainingExamSeconds(1001,0)).toBe(2);expect(remainingExamSeconds(0,100)).toBe(0);
 });
 it("uses the Vietnam day boundary and never treats stale attendance as checked in",()=>{
  expect(studyDateKey(new Date("2026-11-12T17:00:00Z"))).toBe("2026-11-13");
  expect(checkedInOnDate({studyDate:"2026-11-12",checkedInToday:true},"2026-11-13")).toBe(false);
  expect(checkedInOnDate({studyDate:"2026-11-13",checkedInToday:true},"2026-11-13")).toBe(true);expect(checkedInOnDate(null,"2026-11-13")).toBe(false);
 });
 it("only announces promotion when the persisted profile level increased",()=>{
  expect(promotionMessage({hskLevel:2,currentHskLevel:2,previousCurrentHskLevel:1})).toContain("cập nhật lên HSK 2");
  expect(promotionMessage({hskLevel:1,currentHskLevel:1,previousCurrentHskLevel:1})).toContain("không tự tăng");
 });
});

describe("shared answer matching for taking and reviewing", () => {
  it("matches text, full-width IDs, whitespace and trailing punctuation consistently", () => {
    expect(normalizeAnswer(" Ａ。 ")).toBe("a");
    expect(optionMatchesAnswer({id: "A", text: "你好"}, " 你 好。 ")).toBe(true);
    expect(optionMatchesAnswer({id: "A", text: "你好"}, "Ａ")).toBe(true);
    expect(optionMatchesAnswer({id: "A", text: ""}, "")).toBe(false);
  });
  it("handles boolean answer keys without treating an ordinary choice as true/false", () => {
    expect(optionMatchesAnswer({id: "B", text: "错 · Sai"}, "false", "TRUE_FALSE")).toBe(true);
    expect(optionMatchesAnswer({id: "A", text: "对 · Đúng"}, "1", "TRUE_FALSE")).toBe(true);
    expect(optionMatchesAnswer({id: "B", text: "错 · Sai"}, "false", "MULTIPLE_CHOICE")).toBe(false);
    expect(optionMatchesAnswer({id: "A", text: "对"}, "false", "TRUE_FALSE")).toBe(false);
  });
});

it("preserves skill/passage/audio boundaries including tracing and spoken samples", () => {
  const a = { ...item("1"), question: {...item("1").question, skill: "Listening" as const, passageid: "p", audio_url: "/track.mp3"}};
  const b = { ...a, question: {...a.question, questionid: "2"}};
  const c = { ...item("3"), question: {...item("3").question, skill: "Speaking" as const, audio_url: "/sample.mp3"}};
  const tracing = { ...item("4"), question: {...item("4").question, skill: "Writing" as const, templateId: "write-tracing", question: "Luyện viết: 上", audio_url: "/trace.mp3"}};
  const groups = groupPracticeSections({test: {testid: "exam-1", title: "Fixture", audio_url: null, courseid: "", category: "HSK 1", duration: 40, total_marks: 4},
    passages: [{passageid: "p", testid: "exam-1", title: "Passage", passage_text: "正文", order_index: 1}],
    questionsBySkill: {Listening: [a,b], Speaking: [c], Writing: [tracing]}});
  expect(groups.map(g => g.skill)).toEqual(["Listening", "Speaking", "Writing"]);
  expect(groups[0]!.passages[0]!.passage?.passage_text).toBe("正文");
  expect(groups[0]!.passages[0]!.audioGroups[0]!.items.map(q => q.question.questionid)).toEqual(["1", "2"]);
  expect(groups[0]!.passages[0]!.audioGroups[0]!.shared).toBe(true);
  expect(groups[1]!.audioGroups[0]!.audioUrl).toBeNull();
  expect(groups[2]!.audioGroups[0]!.audioUrl).toBeNull();
});
