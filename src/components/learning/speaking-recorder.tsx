"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, RotateCcw, Square } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { encodeStudyWav } from "@/lib/audio-wav";
import { pronunciationResultSchema } from "@/lib/validations/assessment";
import type { PronunciationAssessment } from "@/lib/api/types";

export function SpeakingRecorder({ referenceText, assessment, disabled, locked, onAssessmentChange, onBusyChange, onRecordingChange }: {
  referenceText: string;
  assessment: PronunciationAssessment | null;
  disabled: boolean;
  locked: boolean;
  onAssessmentChange: (assessment: PronunciationAssessment | null) => void;
  onBusyChange: (busy: boolean) => void;
  onRecordingChange: (recorded: boolean) => void;
}) {
  const [stage, setStage] = useState<"idle" | "opening" | "recording" | "processing">("idle");
  const [recording, setRecording] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null);
  const preparedWav = useRef<File | null>(null);
  const alive = useRef(true);
  const busy = useRef(false);
  const callbacks = useRef({ onAssessmentChange, onBusyChange, onRecordingChange });
  callbacks.current = { onAssessmentChange, onBusyChange, onRecordingChange };

  function releaseMicrophone() {
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = null;
  }

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current?.abort();
      if (recorder.current?.state === "recording") recorder.current.stop();
      releaseMicrophone();
      if (busy.current) callbacks.current.onBusyChange(false);
    };
  }, []);

  useEffect(() => {
    if (!recording) {
      setAudioUrl("");
      return;
    }
    const url = URL.createObjectURL(recording);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recording]);

  useEffect(() => {
    if (stage !== "recording") return;
    const startedAt = Date.now();
    const timer = setInterval(() => setSeconds(Math.min(30, Math.floor((Date.now() - startedAt) / 1000))), 250);
    return () => clearInterval(timer);
  }, [stage]);

  async function gradeRecording(blob: Blob) {
    if (!alive.current) return;
    busy.current = true;
    callbacks.current.onBusyChange(true);
    callbacks.current.onAssessmentChange(null);
    setError("");
    setStage("processing");
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 50000);
    let context: AudioContext | null = null;
    try {
      let audio = preparedWav.current;
      if (!audio) {
        if (!blob.size || blob.size > 10 * 1024 * 1024) throw new Error("Bản ghi trống hoặc lớn hơn 10 MB. Hãy ghi âm lại.");
        context = new AudioContext({ sampleRate: 16000 });
        const decoded = await context.decodeAudioData(await blob.arrayBuffer());
        if (!alive.current || controller.signal.aborted) return;
        const buffer = encodeStudyWav(
          Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index)),
          decoded.sampleRate,
        );
        audio = new File([buffer], "hsk-pronunciation.wav", { type: "audio/wav" });
        preparedWav.current = audio;
      }
      const form = new FormData();
      form.set("audio", audio);
      form.set("referenceText", referenceText.trim());
      const response = await apiFetch<unknown>("ai/speaking/pronunciation-assessment", {
        method: "POST", body: form, signal: controller.signal,
      });
      if (!alive.current || controller.signal.aborted) return;
      const parsed = pronunciationResultSchema.safeParse(response);
      if (!parsed.success) throw new Error("Kết quả chấm phát âm chưa hợp lệ. Hãy thử chấm lại.");
      callbacks.current.onAssessmentChange(parsed.data);
    } catch (cause) {
      if (alive.current) {
        setError(controller.signal.aborted
          ? "Nhận diện giọng nói quá lâu. Bản ghi vẫn còn để nghe lại; hãy thử chấm lại."
          : cause instanceof Error ? cause.message : "Chưa nhận diện được giọng nói. Hãy thử chấm lại.");
      }
    } finally {
      clearTimeout(timeout);
      await context?.close().catch(() => {});
      if (request.current === controller) request.current = null;
      if (alive.current) {
        busy.current = false;
        setStage("idle");
        callbacks.current.onBusyChange(false);
      }
    }
  }

  async function startRecording() {
    if (disabled || locked || busy.current) return;
    busy.current = true;
    callbacks.current.onBusyChange(true);
    setStage("opening");
    setError("");
    try {
      if (!referenceText.trim()) throw new Error("Bài này chưa có nội dung tiếng Trung để đọc.");
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error("Chưa mở được micro. Hãy mở website bằng HTTPS hoặc localhost trên trình duyệt hỗ trợ ghi âm.");
      }
      const captureStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) {
        captureStream.getTracks().forEach(track => track.stop());
        return;
      }
      stream.current = captureStream;
      host.current?.closest("form")?.querySelectorAll("audio").forEach(audio => audio.pause());
      const media = new MediaRecorder(captureStream);
      const chunks: Blob[] = [];
      let captureFailed = false;
      recorder.current = media;
      media.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      media.onerror = () => {
        captureFailed = true;
        releaseMicrophone();
        if (!alive.current) return;
        busy.current = false;
        setStage("idle");
        setError("Ghi âm bị gián đoạn. Hãy kiểm tra micro và thử lại.");
        callbacks.current.onBusyChange(false);
      };
      media.onstop = () => {
        releaseMicrophone();
        recorder.current = null;
        if (!alive.current || captureFailed) return;
        const blob = new Blob(chunks, { type: media.mimeType || chunks[0]?.type || "audio/webm" });
        if (!blob.size) {
          busy.current = false;
          setStage("idle");
          setError("Bản ghi trống. Hãy bấm micro và đọc lại.");
          callbacks.current.onBusyChange(false);
          return;
        }
        setRecording(blob);
        callbacks.current.onRecordingChange(true);
        void gradeRecording(blob);
      };
      media.start();
      preparedWav.current = null;
      setRecording(null);
      callbacks.current.onRecordingChange(false);
      callbacks.current.onAssessmentChange(null);
      setSeconds(0);
      setStage("recording");
      stopTimer.current = setTimeout(() => {
        if (media.state === "recording") media.stop();
      }, 29500);
    } catch (cause) {
      releaseMicrophone();
      if (alive.current) {
        busy.current = false;
        setStage("idle");
        setError(cause instanceof Error && ["NotAllowedError", "SecurityError"].includes(cause.name)
          ? "Chưa được cấp quyền micro. Hãy cho phép website truy cập micro trong trình duyệt rồi thử lại."
          : cause instanceof Error && cause.name === "NotFoundError"
            ? "Không tìm thấy micro. Hãy kết nối hoặc kiểm tra thiết bị thu âm."
            : cause instanceof Error ? cause.message : "Không thể ghi âm. Hãy thử lại.");
        callbacks.current.onBusyChange(false);
      }
    }
  }

  const processing = stage === "processing";
  const blocked = disabled || locked || stage !== "idle";
  return (
    <div ref={host} className="flex min-w-0 flex-col items-center gap-4 rounded-lg border border-mist bg-paper p-4">
      {!referenceText.trim() && <p className="hsk-notice">Câu này chưa có nội dung tiếng Trung để đối chiếu.</p>}
      {stage === "recording" ? (
        <button type="button" aria-label="Dừng ghi âm" className="flex h-16 w-16 items-center justify-center rounded-full bg-danger text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-danger"
          onClick={() => { if (recorder.current?.state === "recording") recorder.current.stop(); }}>
          <Square size={24} fill="currentColor" aria-hidden="true" />
        </button>
      ) : (
        <button type="button" aria-label={recording ? "Ghi âm lại" : "Bắt đầu nói"} disabled={blocked || !referenceText.trim()}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => { void startRecording(); }}>
          {stage === "opening" || processing ? <Loader2 size={24} className="animate-spin" aria-hidden="true" /> : <Mic size={24} aria-hidden="true" />}
        </button>
      )}
      <p className="text-center text-sm leading-6 text-slate" role="status">
        {stage === "opening" ? "Đang mở micro…"
          : stage === "recording" ? "Đang ghi âm " + seconds + "/30 giây. Bấm nút vuông để dừng."
            : processing ? "Đang nhận diện giọng nói và chấm phát âm…"
              : disabled ? "Đã kết thúc bài luyện nói."
                : recording ? "Bạn có thể nghe giọng mình hoặc ghi âm lại."
                  : "Bấm micro rồi đọc to nội dung trên. Tối đa 30 giây."}
      </p>
      {error && <div className="w-full"><p className="hsk-error" role="alert">{error}</p>
        {recording && !disabled && <button type="button" disabled={blocked} className="hsk-button-secondary mt-3" onClick={() => { void gradeRecording(recording); }}>
          <RotateCcw size={16} aria-hidden="true" /> Thử chấm lại
        </button>}
      </div>}
      {audioUrl && <div className="w-full"><p className="mb-2 text-xs font-medium text-slate">Giọng của bạn</p>
        <audio controls className="w-full" src={audioUrl} aria-label="Nghe lại giọng của bạn" />
      </div>}
      {assessment && (
        <div className="w-full rounded-lg border border-brand/20 bg-surface p-4" aria-live="polite">
          <p className="text-2xl font-semibold text-brand">{assessment.score}<span className="text-sm font-normal text-slate">/100</span></p>
          <p className="mt-3 text-xs text-slate">Nội dung nhận diện</p>
          <p lang="zh-CN" className="mt-1 whitespace-pre-line text-base leading-8 text-ink">{assessment.recognizedText || "Chưa nhận diện được nội dung."}</p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[["Phát âm", assessment.accuracyScore], ["Trôi chảy", assessment.fluencyScore], ["Đọc đủ", assessment.completenessScore]].map(([label, score]) => (
              <div key={label} className="rounded-lg bg-paper p-2"><dt className="text-xs text-slate">{label}</dt><dd className="mt-1 font-semibold text-ink">{score}</dd></div>
            ))}
          </dl>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate">{assessment.feedback}</p>
          {assessment.words.length > 0 && <ul className="mt-3 flex flex-wrap gap-2" aria-label="Phát âm từng từ">
            {assessment.words.map((word, index) => <li key={index} className="rounded-lg border border-mist px-2 py-1 text-sm text-ink">
              {word.word} · {word.accuracyScore ?? "Chưa chấm"}
            </li>)}
          </ul>}
        </div>
      )}
      {disabled && !recording && <p className="text-sm text-slate">Chưa có bản ghi cho câu này.</p>}
    </div>
  );
}
