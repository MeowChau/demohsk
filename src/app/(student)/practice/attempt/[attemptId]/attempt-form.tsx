"use client";

import { useState, useEffect, useRef } from "react";
import { SKILL_LABELS } from "@/lib/hsk";
import type { TestWithQuestions, Skill, Question } from "@/types/assessment";
import { publicMedia } from "@/lib/api/config";
import { HanziPractice } from "@/components/learning/hanzi-practice";
import { writingPractice, type HandwritingProgress } from "@/lib/writing-practice";

export function AttemptForm({
  attemptid,
  testid,
  data,
}: {
  attemptid: string;
  testid: string;
  data: TestWithQuestions;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [handwriting, setHandwriting] = useState<Record<string, HandwritingProgress>>({});
  const [notice, setNotice] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(data.test.duration * 60);
  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    if (data.test.duration <= 0) return;
    if (secondsLeft <= 0) {
      if (!autoSubmitted.current) {
        autoSubmitted.current = true;
        formRef.current?.requestSubmit();
      }
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const low = secondsLeft <= 60;
  const questions = Object.values(data.questionsBySkill).flatMap(items => items || []);
  const tracingOnly = questions.length > 0 && questions.every(item => writingPractice(item.question) !== null);

  const passageFor = (passageid: string | null) =>
    passageid ? data.passages.find((p) => p.passageid === passageid) : null;

  return (
    <form ref={formRef} onSubmit={(event) => {
      event.preventDefault();
      const blob = new Blob([JSON.stringify({ testid, answers, handwriting }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = `hsk-${testid}.json`; link.click(); URL.revokeObjectURL(url);
      setNotice("Bản sao bài tự luyện đã được tải về máy, gồm câu trả lời và tiến độ luyện nét. Bài này chưa lưu kết quả vào tài khoản hoặc chấm điểm.");
    }} className="flex flex-col gap-8">
      <input type="hidden" name="attemptid" value={attemptid} />
      <input type="hidden" name="testid" value={testid} />
      <input type="hidden" name="answers" value={JSON.stringify(answers)} />

      <div
        className={`sticky top-0 z-10 self-end rounded-pill px-4 py-1.5 text-sm font-semibold ${
          low ? "bg-danger text-white" : "bg-surface text-ink shadow-card"
        }`}
      >
        {data.test.duration > 0 ? `${mm}:${ss}` : "Tự luyện"}
      </div>

      {data.test.audio_url && !tracingOnly && (
        <audio controls src={data.test.audio_url} className="w-full rounded-md" />
      )}

      {(Object.entries(data.questionsBySkill) as [string, typeof data.questionsBySkill[keyof typeof data.questionsBySkill]][]).map(
        ([skill, items]) => {
          const byPassage = new Map<string, typeof items>();
          const noPassage: NonNullable<typeof items> = [];
          items?.forEach((item) => {
            const pid = item.question.passageid;
            if (pid) {
              const list = byPassage.get(pid) ?? [];
              list.push(item);
              byPassage.set(pid, list as typeof items);
            } else {
              noPassage.push(item);
            }
          });

          return (
            <section key={skill}>
              <h2 className="mb-3 font-display text-lg font-semibold text-ink">{SKILL_LABELS[skill as Skill]}</h2>

              {Array.from(byPassage.entries()).map(([pid, groupItems]) => {
                const passage = passageFor(pid);
                return (
                  <div key={pid} className="mb-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-md border border-mist bg-surface p-4 text-sm leading-relaxed text-slate max-h-[500px] overflow-y-auto">
                      <h3 className="mb-2 font-display font-semibold text-ink">{passage?.title}</h3>
                      <p className="whitespace-pre-line">{passage?.passage_text}</p>
                    </div>
                    <div className="flex flex-col gap-4">
                      {groupItems?.map(({ question, options }) => (
                        <QuestionBlock
                          key={question.questionid}
                          question={question}
                          options={options}
                          answers={answers}
                          setAnswers={setAnswers}
                          setHandwriting={setHandwriting}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-col gap-4">
                {noPassage.map(({ question, options }) => (
                  <QuestionBlock
                    key={question.questionid}
                    question={question}
                    options={options}
                    answers={answers}
                    setAnswers={setAnswers}
                    setHandwriting={setHandwriting}
                  />
                ))}
              </div>
            </section>
          );
        }
      )}

      {notice && <p role="status" className="text-sm text-slate">{notice}</p>}
      <button
        type="submit"
        className="w-fit rounded-pill bg-teal px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
         Tải bài tự luyện của tôi </button>
    </form>
  );
}

function QuestionBlock({
  question,
  options,
  answers,
  setAnswers,
  setHandwriting,
}: {
  question: Question;
  options: { optionid: string; option_text: string; image_url?: string | null }[];
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setHandwriting: React.Dispatch<React.SetStateAction<Record<string, HandwritingProgress>>>;
}) {
  const handwriting = writingPractice(question);
  const usesTextAnswer = options.length === 0 ||
    ["FILL_IN_BLANK", "SHORT_ANSWER", "ESSAY"].includes(question.type || "");
  return (
    <div className="rounded-md border border-mist bg-surface p-4">
      <p className="mb-3 text-sm font-medium text-ink">{question.question}</p>
      {question.pinyin && <p lang="zh-Latn" className="mb-2 text-sm text-slate">{question.pinyin}</p>}
      {question.translation && <p className="mb-3 text-sm text-slate-soft">{question.translation}</p>}
      {[question.context_image_url,question.image_url,question.continuation_image_url].filter(Boolean).map((src,index) => <img key={index} src={publicMedia(src) || undefined} alt="Hình minh họa câu hỏi" className="mb-3 max-w-full rounded-md" loading="lazy"/>)}
      {question.audio_url && !handwriting && <audio controls preload="none" src={publicMedia(question.audio_url) || undefined} className="mb-3 w-full"/>}
      {handwriting ? (
        handwriting.text ? (
          <div className="mt-4">
            <p className="mb-4 text-sm leading-6 text-slate">Viết từng nét bằng chuột hoặc cảm ứng. Bấm “Xem mẫu” để xem thứ tự nét, rồi luyện lần lượt từng chữ.</p>
            <HanziPractice text={handwriting.text} onProgress={progress => setHandwriting(previous => ({ ...previous, [question.questionid]: progress }))} />
          </div>
        ) : <p className="hsk-notice">Câu luyện nét này chưa có chữ mẫu dạng văn bản. Hãy đối chiếu ảnh đề hoặc chọn câu khác.</p>
      ) : usesTextAnswer ? (
        <>
        {options.length > 0 && <p className="mb-3 rounded-sm bg-paper p-3 text-sm text-slate">Từ gợi ý: {options.map((option) => option.option_text).join(" · ")}</p>}
        <textarea
          rows={8}
          aria-label="Câu trả lời bằng tiếng Trung"
          className="hsk-input min-h-32"
          value={answers[question.questionid] ?? ""}
          onChange={(e) => setAnswers((prev) => ({ ...prev, [question.questionid]: e.target.value }))}
          placeholder="Nhập câu trả lời bằng tiếng Trung…"
        />
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {options.map((opt) => (
            <label key={opt.optionid} className="flex items-center gap-2 text-sm text-slate">
              <input
                type="radio"
                name={question.questionid}
                value={opt.optionid}
                checked={answers[question.questionid] === opt.optionid}
                onChange={() => setAnswers((prev) => ({ ...prev, [question.questionid]: opt.optionid }))}
              />
              {opt.option_text}
              {opt.image_url && <img src={publicMedia(opt.image_url) || undefined} alt={`Đáp án ${opt.optionid}`} className="max-w-48 rounded-md" loading="lazy"/>}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
