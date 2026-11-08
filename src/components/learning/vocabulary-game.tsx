"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, RotateCcw, Save, CheckCircle2 } from "lucide-react";
import { vocabularyQuestions } from "@/lib/vocabulary-game";
import { apiAction } from "@/lib/api/client";
import type { HskWord } from "@/lib/api/types";
import { StudyTracker } from "@/components/shell/study-tracker";
import { STUDY_MODULES } from "@/lib/hsk";

export function VocabularyGame({ words }: { words: HskWord[] }) {
  const [questions, setQuestions] = useState(() => vocabularyQuestions(words));
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const current = questions[index];
  const finished = started && index >= questions.length;
  const score = correctCount * 10;
  async function save() {
    if (saving || saved) return;
    setSaving(true); setError("");
    try { await apiAction("game/offline/submit", { score }); setSaved(true); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa lưu được điểm trò chơi."); }
    finally { setSaving(false); }
  }
  if (!questions.length) return <div className="hsk-panel"><h2 className="hsk-section-title">Chưa đủ từ để tạo lượt chơi</h2><p className="mt-3 text-sm text-slate">Cần ít nhất 4 từ có nghĩa khác nhau. Bạn thử chọn cấp độ khác.</p></div>;
  return <div className="hsk-panel flex flex-col gap-5">
    <h2 className="hsk-section-title">Chọn nghĩa của từ</h2>
    {!started ? <><p className="text-sm leading-7 text-slate">Mỗi lượt gồm {questions.length} từ lấy từ kho từ vựng của hệ thống. Chọn đúng nhận 10 điểm. Bạn có thể lưu điểm sau khi hoàn thành.</p><button className="hsk-button w-fit" onClick={() => { setQuestions(vocabularyQuestions(words)); setStarted(true); }}><Play size={16} />Bắt đầu lượt chơi</button></> : finished ? <><p className="text-3xl font-semibold text-brand">{score} điểm</p><p className="text-sm text-slate">Bạn trả lời đúng {correctCount} / {questions.length} từ.</p>{error && <p className="hsk-error" role="alert">{error}</p>}{saved && <p className="flex items-center gap-2 text-sm text-success" role="status"><CheckCircle2 size={16} />Đã lưu điểm vào tài khoản.</p>}<div className="flex flex-wrap gap-3"><button type="button" className="hsk-button" disabled={saved || saving} onClick={() => { void save(); }}><Save size={16} />{saved ? "Đã lưu" : saving ? "Đang lưu…" : "Lưu kết quả"}</button><button type="button" className="hsk-button-secondary" disabled={saving} onClick={() => { setStarted(false); setIndex(0); setCorrectCount(0); setAnswer(null); setSaved(false); setError(""); router.refresh(); }}><RotateCcw size={16} />Chơi lại</button></div></> : current && <>
      <StudyTracker module={STUDY_MODULES.vocabulary} />
      <div className="flex items-center justify-between text-sm text-slate"><span>Từ {index + 1} / {questions.length}</span><span>{score} điểm</span></div><div className="py-4 text-center"><p lang="zh-CN" className="hsk-hanzi text-ink">{current.word.hanzi}</p><p className="mt-2 text-base text-brand">{current.word.pinyin}</p></div><div className="grid gap-3 sm:grid-cols-2">{current.choices.map(choice => <button key={choice.id} type="button" disabled={answer !== null} aria-pressed={answer === choice.id} onClick={() => { if (answer !== null) return; setAnswer(choice.id); if (choice.id === current.word.id) setCorrectCount(count => count + 1); }} className={`min-h-16 rounded-lg border p-4 text-left text-sm leading-6 transition ${answer === null ? "border-mist text-ink hover:border-brand hover:bg-brand/5" : choice.id === current.word.id ? "border-success bg-success-soft text-success" : answer === choice.id ? "border-danger bg-danger-soft text-danger" : "border-mist text-slate"}`}>{choice.meaning}</button>)}</div>{answer !== null && <div className="flex flex-wrap items-center justify-between gap-3"><p className={`text-sm ${answer === current.word.id ? "text-success" : "text-danger"}`}>{answer === current.word.id ? "Chính xác!" : "Chưa đúng. Đáp án được đánh dấu màu xanh."}</p><button type="button" className="hsk-button" onClick={() => { setIndex(value => value + 1); setAnswer(null); }}>{index + 1 === questions.length ? "Xem kết quả" : "Từ tiếp theo →"}</button></div>}
    </>}
  </div>;
}
