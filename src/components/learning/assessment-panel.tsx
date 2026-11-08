"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Upload, Sparkles } from "lucide-react";
import { apiAction, apiFetch } from "@/lib/api/client";
import { encodeStudyWav } from "@/lib/audio-wav";
import type { HskQuestion, WritingAssessment, PronunciationAssessment } from "@/lib/api/types";
import { QuestionContent } from "./question-content";
import { StudyTracker } from "@/components/shell/study-tracker";
import { STUDY_MODULES } from "@/lib/hsk";
import { useValidatedForm } from "@/hooks/use-validated-form";
import { writingAssessmentSchema, pronunciationAssessmentSchema } from "@/lib/validations/assessment";
import { AUDIO_ACCEPT, audioFileError } from "@/lib/validations/files";
import { FieldError } from "@/components/ui/field-error";
import { cn } from "@/lib/utils";

export function AssessmentPanel({ questions, level, mode }: { questions: HskQuestion[]; level: number; mode: "writing" | "speaking" }) {
  const [questionId, setQuestionId] = useState(String(questions[0]?.id || ""));
  const [text, setText] = useState("");
  const [reference, setReference] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [openingMic, setOpeningMic] = useState(false);
  const [converting, setConverting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [audioError, setAudioError] = useState<string | null>(null);
  const validation = useValidatedForm(mode === "writing" ? writingAssessmentSchema : pronunciationAssessmentSchema);
  const [writing, setWriting] = useState<WritingAssessment | null>(null);
  const [pronunciation, setPronunciation] = useState<PronunciationAssessment | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const question = questions.find(item => String(item.id) === questionId);
  useEffect(() => { alive.current = true; return () => { alive.current = false; if (timer.current) clearTimeout(timer.current); if (recorder.current?.state === "recording") recorder.current.stop(); stream.current?.getTracks().forEach(track => track.stop()); }; }, []);
  useEffect(() => { if (!audio) { setAudioUrl(""); return; } const url = URL.createObjectURL(audio); setAudioUrl(url); return () => URL.revokeObjectURL(url); }, [audio]);
  async function prepareAudio(blob: Blob) {
    setConverting(true); setError(""); setAudioError(null); setPronunciation(null);
    let context: AudioContext | null = null;
    try {
      if (blob.size > 10 * 1024 * 1024) throw new Error("Tệp âm thanh cần nhỏ hơn 10 MB.");
      context = new AudioContext({ sampleRate: 16000 });
      const decoded = await context.decodeAudioData(await blob.arrayBuffer());
      const data = encodeStudyWav(Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index)), decoded.sampleRate);
      if (alive.current) setAudio(new File([data], "hsk-pronunciation.wav", { type: "audio/wav" }));
    } catch (cause) { if (alive.current) setAudioError(cause instanceof Error ? cause.message : "Không đọc được bản ghi. Hãy thử tệp WAV hoặc ghi âm lại."); }
    finally { await context?.close().catch(() => {}); if (alive.current) setConverting(false); }
  }
  async function startRecording() {
    setOpeningMic(true);
    setError(""); setAudioError(null); setAudio(null); setPronunciation(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("Trình duyệt chưa hỗ trợ ghi âm. Bạn có thể tải tệp âm thanh lên.");
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) { stream.current.getTracks().forEach(track => track.stop()); return; }
      const media = new MediaRecorder(stream.current);
      recorder.current = media;
      const chunks: Blob[] = [];
      media.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      media.onstop = () => { stream.current?.getTracks().forEach(track => track.stop()); if (timer.current) clearTimeout(timer.current); if (alive.current) { setRecording(false); void prepareAudio(new Blob(chunks, { type: media.mimeType })); } };
      media.start(); setRecording(true);
      timer.current = setTimeout(() => { if (media.state === "recording") media.stop(); }, 29500);
    } catch (cause) { stream.current?.getTracks().forEach(track => track.stop()); if (alive.current) setError(cause instanceof Error && cause.name !== "NotAllowedError" ? cause.message : "Chưa mở được micro. Kiểm tra quyền truy cập micro hoặc tải bản ghi lên."); }
    finally { if (alive.current) setOpeningMic(false); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || recording || openingMic || converting) return;
    setError("");
    const values = validation.validateForm(event.currentTarget);
    const fileError = mode === "speaking" ? audioFileError(audio) : null;
    setAudioError(fileError);
    if (!values || fileError) return;
    setBusy(true); setWriting(null); setPronunciation(null);
    try {
      if ("userText" in values) {
        setWriting(await apiAction<WritingAssessment>("ai/writing-assessment", values));
      } else {
        if (!audio) return;
        const form = new FormData(); form.set("audio", audio); form.set("referenceText", values.referenceText);
        setPronunciation(await apiFetch<PronunciationAssessment>("ai/speaking/pronunciation-assessment", { method: "POST", body: form }));
      }
    } catch (cause) { validation.applyServerError(cause); setError(cause instanceof Error ? cause.message : "Dịch vụ chấm bài chưa sẵn sàng. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  return <div className="grid items-start gap-5 lg:grid-cols-2">
    {(text || recording || audio) && <StudyTracker module={mode === "writing" ? STUDY_MODULES.Writing : STUDY_MODULES.Speaking} />}
    <form {...validation.formProps} onSubmit={submit} onChangeCapture={event => { validation.formProps.onChangeCapture(event); setError(""); }} className="hsk-panel flex flex-col gap-5">
      {mode === "writing" ? <>
        <input type="hidden" name="hskLevel" value={level} />
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium leading-6 text-ink" htmlFor="questionId">Câu hỏi từ bộ luyện viết <span className="text-danger" aria-hidden="true">*</span></label>
          <select id="questionId" name="questionId" required className={cn("hsk-input", validation.errors.questionId && "border-danger focus:border-danger focus:ring-danger/10")} aria-invalid={Boolean(validation.errors.questionId)} aria-describedby={validation.errors.questionId ? "questionId-error" : undefined} value={questionId} onChange={event => { setQuestionId(event.target.value); setWriting(null); }} disabled={busy}>
            <option value="">Chọn câu hỏi</option>{questions.map(item => <option key={item.id} value={item.id}>Câu #{item.id} · {(item.payload.text || "Bài luyện viết").slice(0, 80)}</option>)}
          </select>
          <FieldError id="questionId-error" message={validation.errors.questionId} />
        </div>
        {question && <div className="rounded-lg border border-mist p-4"><QuestionContent question={question} /></div>}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium leading-6 text-ink" htmlFor="userText">Bài viết của bạn <span className="text-danger" aria-hidden="true">*</span></label>
          <textarea id="userText" name="userText" lang="zh-CN" className={cn("hsk-input min-h-64 text-base leading-8", validation.errors.userText && "border-danger focus:border-danger focus:ring-danger/10")} aria-invalid={Boolean(validation.errors.userText)} aria-describedby={`userText-hint${validation.errors.userText ? " userText-error" : ""}`} value={text} onChange={event => { setText(event.target.value); setWriting(null); }} maxLength={10000} required disabled={busy} placeholder="Nhập bài viết bằng tiếng Trung…" />
          <FieldError id="userText-error" message={validation.errors.userText} />
          <p id="userText-hint" className="text-xs text-slate-soft">{text.length.toLocaleString("vi-VN")} / 10.000 ký tự</p>
        </div>
      </> : <>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium leading-6 text-ink" htmlFor="referenceText">Nội dung cần đọc <span className="text-danger" aria-hidden="true">*</span></label>
          <textarea id="referenceText" name="referenceText" lang="zh-CN" className={cn("hsk-input min-h-28 text-base leading-8", validation.errors.referenceText && "border-danger focus:border-danger focus:ring-danger/10")} aria-invalid={Boolean(validation.errors.referenceText)} aria-describedby={`referenceText-hint${validation.errors.referenceText ? " referenceText-error" : ""}`} value={reference} onChange={event => { setReference(event.target.value); setPronunciation(null); }} maxLength={5000} required disabled={busy} placeholder="Ví dụ: 我每天学习中文。" />
          <FieldError id="referenceText-error" message={validation.errors.referenceText} />
          <p id="referenceText-hint" className="text-xs text-slate-soft">Tối đa 5.000 ký tự.</p>
        </div>
        <p id="audio-hint" className="text-sm leading-6 text-slate">Ghi âm tối đa 30 giây hoặc chọn bản ghi tối đa 10 MB. Bạn có thể nghe lại trước khi gửi chấm.</p>
        <div className="flex flex-wrap gap-3">
          {recording ? <button type="button" className="hsk-button bg-danger hover:bg-danger" onClick={() => recorder.current?.stop()}><Square size={16} />Dừng ghi âm</button> : <button type="button" className="hsk-button-secondary" onClick={() => { void startRecording(); }} disabled={busy || converting || openingMic}><Mic size={16} />{openingMic ? "Đang mở micro…" : "Ghi âm"}</button>}
          <label className={cn("hsk-button-secondary cursor-pointer", (recording || openingMic || busy || converting) && "pointer-events-none opacity-50", (audioError || validation.errors.audio) && "border-danger")}>
            <Upload size={16} />Tải bản ghi
            <input className="sr-only" name="audio" aria-label="Chọn bản ghi âm" aria-invalid={Boolean(audioError || validation.errors.audio)} aria-describedby={`audio-hint${audioError || validation.errors.audio ? " audio-error" : ""}`} type="file" accept={AUDIO_ACCEPT} disabled={recording || openingMic || busy || converting} onChange={event => {
              const file = event.target.files?.[0];
              if (file) { setAudio(null); const message = audioFileError(file); setAudioError(message); if (!message) void prepareAudio(file); }
              event.target.value = "";
            }} />
          </label>
        </div>
        <FieldError id="audio-error" message={audioError || validation.errors.audio} />
        {converting && <p className="text-sm text-slate" role="status">Đang chuẩn bị bản ghi…</p>}
        {audioUrl && <audio className="w-full" controls src={audioUrl} aria-label="Nghe lại bản ghi" />}
      </>}
      {error && <p className="hsk-error" role="alert">{error}</p>}<button type="submit" className="hsk-button" disabled={busy || recording || openingMic || converting}><Sparkles size={16} />{busy ? "Đang chấm bài…" : mode === "writing" ? "Chấm bài viết" : "Chấm phát âm"}</button>
    </form>
    <section className="hsk-panel flex flex-col gap-4" aria-live="polite"><h2 className="hsk-section-title">Nhận xét bài làm</h2>{!writing && !pronunciation && <p className="text-sm leading-6 text-slate">Kết quả và nhận xét xuất hiện sau khi dịch vụ chấm bài trả phản hồi. Điểm chấm bài này không thay thế kết quả thi HSK chính thức.</p>}{writing && <><p className="text-3xl font-semibold text-brand">{writing.score}<span className="text-base text-slate"> / 100</span></p><p className="whitespace-pre-line text-sm leading-7 text-slate">{writing.feedback}</p>{writing.grammarErrors.length > 0 && <div className="flex flex-col gap-3"><h3 className="text-sm font-semibold text-ink">Gợi ý sửa</h3>{writing.grammarErrors.map((item, index) => <div key={index} className="rounded-lg border border-mist p-3 text-sm leading-7"><p className="text-danger">{item.error}</p><p className="text-success">{item.correction}</p></div>)}</div>}</>}{pronunciation && <><p className="text-3xl font-semibold text-brand">{pronunciation.score}<span className="text-base text-slate"> / 100</span></p><div className="grid grid-cols-3 gap-3">{[["Chính xác", pronunciation.accuracyScore], ["Trôi chảy", pronunciation.fluencyScore], ["Đầy đủ", pronunciation.completenessScore]].map(([label, value]) => <div className="rounded-lg border border-mist p-3" key={label}><p className="text-xs text-slate">{label}</p><p className="mt-2 text-lg font-semibold text-ink">{value}</p></div>)}</div><p lang="zh-CN" className="text-base leading-8 text-ink">{pronunciation.recognizedText}</p><p className="whitespace-pre-line text-sm leading-7 text-slate">{pronunciation.feedback}</p><div className="flex flex-wrap gap-2">{pronunciation.words.map((word, index) => <span key={index} className="rounded-lg border border-mist px-3 py-2 text-sm text-ink">{word.word} · {word.accuracyScore ?? "—"}</span>)}</div></>}</section>
  </div>;
}
