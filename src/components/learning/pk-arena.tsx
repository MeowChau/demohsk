"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Swords, RefreshCw, Check, Search } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { publicMedia } from "@/lib/api/config";
import { HSK_LEVELS } from "@/lib/hsk";
import type { PkMatch, PkResult, PkAnswer, PkCommand } from "@/types/pk";

export function PkArena({ userId, level }: { userId: number; level: number }) {
  const [ready, setReady] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState<number | null>(null);
  const [match, setMatch] = useState<PkMatch | null>(null);
  const [result, setResult] = useState<PkResult | null>(null);
  const [answer, setAnswer] = useState<PkAnswer | null>(null);
  const [submittedQuestion, setSubmittedQuestion] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);
  const events = useRef<EventSource | null>(null);
  const alive = useRef(true);
  const generation = useRef(0);
  const router = useRouter();
  const storageKey = `hsk:pk-room:${level}`;

  const post = useCallback(async (event: PkCommand["event"], payload: Partial<PkCommand> = {}) => {
    const response = await fetch("/api/pk", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, hskLevel: level, ...payload }) });
    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.message || "Chưa gửi được thao tác PK.");
  }, [level]);
  const connect = useCallback(async () => {
    const currentGeneration = ++generation.current;
    events.current?.close(); setReady(false); setError("");
    try {
      await apiFetch("auth/me");
      if (!alive.current || generation.current !== currentGeneration) return;
      let savedRoom = "";
      try { savedRoom = sessionStorage.getItem(storageKey) || ""; } catch { /* Storage is optional. */ }
      const query = new URLSearchParams({ hskLevel: String(level), ...(savedRoom ? { roomId: savedRoom } : {}) });
      const stream = new EventSource("/api/pk?" + query);
      events.current = stream;
      stream.onmessage = message => {
        if (!alive.current || generation.current !== currentGeneration) return;
        let envelope: { event: string; payload: Record<string, unknown> };
        try { envelope = JSON.parse(message.data); } catch { return; }
        const payload = envelope.payload || {};
        if (envelope.event === "pk_connected") {
          setReady(true); setOnline(Number(payload.count));
          if (savedRoom) { const roomId = savedRoom; savedRoom = ""; void post("find_match", { roomId }).catch(cause => setError(cause.message)); }
          return;
        }
        if (envelope.event === "online_count_update") { if (Number(payload.hskLevel) === level) setOnline(Number(payload.count)); return; }
        if (["connection_closed", "connection_error", "exception"].includes(envelope.event)) {
          setError(String(payload.message || "Kết nối PK chưa sẵn sàng.")); setQueueing(false);
          if (envelope.event !== "exception") { setReady(false); stream.close(); }
          return;
        }
        if (envelope.event === "match_cancelled") { setQueueing(false); setMatch(null); setResult(null); setError(String(payload.message || "Trận đấu đã được hủy.")); try { sessionStorage.removeItem(storageKey); } catch {} return; }
        if (payload.roomId && typeof payload.revision === "number") {
          const incoming = payload as unknown as PkMatch;
          offset.current = incoming.serverNow - Date.now(); setNow(Date.now());
          setMatch(previous => {
            if (previous?.roomId === incoming.roomId && previous.revision > incoming.revision) return previous;
            return { ...previous, ...incoming, questions: incoming.questions || (previous?.roomId === incoming.roomId ? previous.questions : []) };
          });
        }
        if (envelope.event === "match_found") { setQueueing(false); setResult(null); setAnswer(null); setSubmittedQuestion(null); setError(""); try { sessionStorage.setItem(storageKey, String(payload.roomId)); } catch {} }
        if (envelope.event === "game_started" || envelope.event === "turn_changed") { setQueueing(false); setAnswer(null); setSubmittedQuestion(null); }
        if (envelope.event === "answer_result") setAnswer(payload as unknown as PkAnswer);
        if (envelope.event === "game_finished") { setResult(payload as unknown as PkResult); setQueueing(false); try { sessionStorage.removeItem(storageKey); } catch {} router.refresh(); }
      };
      stream.onerror = () => { if (!alive.current || generation.current !== currentGeneration) return; stream.close(); setReady(false); setQueueing(false); setError("Kết nối PK bị gián đoạn. Bấm Kết nối lại để khôi phục trận đang chơi."); };
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : "Chưa kết nối được phòng PK."); }
  }, [level, post, router, storageKey]);
  useEffect(() => { alive.current = true; void connect(); const timer = setInterval(() => setNow(Date.now()), 250); return () => { alive.current = false; generation.current++; events.current?.close(); clearInterval(timer); }; }, [connect]);
  async function command(event: PkCommand["event"], payload: Partial<PkCommand> = {}) {
    if (busy) return;
    setBusy(true); setError("");
    if (event === "find_match") { setQueueing(true); setResult(null); setMatch(null); setAnswer(null); }
    try { await post(event, payload); if (event === "cancel_match") { setQueueing(false); setMatch(null); } }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Thao tác chưa thành công."); if (event === "find_match") setQueueing(false); if (event === "submit_answer") setSubmittedQuestion(null); }
    finally { setBusy(false); }
  }
  const lockLevel = queueing || Boolean(match && !result);
  const current = match?.questions?.[match.index];
  const seconds = Math.max(0, Math.ceil(((match?.deadline || 0) - (now + offset.current)) / 1000));
  const myTurn = match?.turnUserId === userId;
  const myReward = result?.rewards?.find(reward => reward.userId === userId)?.expAwarded;
  return <section className="hsk-panel flex flex-col gap-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="hsk-section-title">Phòng PK</h2><span className={`rounded-full px-3 py-1 text-xs font-medium ${ready ? "bg-success-soft text-success" : "bg-mist text-slate"}`}>{ready ? `Đã kết nối · ${online ?? "—"} học viên online` : "Chưa kết nối"}</span></div>
    <form action="/games" className="flex flex-wrap items-end gap-3 border-b border-mist pb-5">
      <label className="hsk-label">Cấp độ HSK
        <select name="hskLevel" defaultValue={level} className="hsk-input min-w-32" disabled={lockLevel}>
          {HSK_LEVELS.map(value => <option key={value} value={value}>HSK {value}</option>)}
        </select>
      </label>
      <button type="submit" className="hsk-button-secondary" disabled={lockLevel}>Đổi cấp độ</button>
      {lockLevel && <p className="pb-3 text-xs text-slate">Cấp độ được giữ trong suốt quá trình tìm và đấu trận.</p>}
    </form>
    {error && <p className="hsk-error" role="alert">{error}</p>}
    {!ready && <button type="button" className="hsk-button-secondary w-fit" onClick={() => { void connect(); }}><RefreshCw size={16} />Kết nối lại</button>}
    {(!match || result) && (
      <div className="flex flex-col items-center gap-5 rounded-lg bg-paper px-4 py-8 text-center sm:px-6">
        {queueing && <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand" aria-hidden="true">
          <Search size={28} className="motion-safe:animate-pulse" />
        </div>}
        {result ? (
          <div className="w-full rounded-lg border border-brand/20 bg-brand/5 p-5">
            <h3 className="text-xl font-semibold text-ink">{result.winnerId === null ? "Hai bạn hòa nhau" : result.winnerId === userId ? "Bạn đã thắng!" : "Đối thủ đã chiến thắng"}</h3>
            <p className="mt-2 text-sm text-slate">EXP nhận được: <strong className="text-brand">{myReward === undefined ? "Đang cập nhật" : "+" + myReward + " EXP"}</strong> · Thời gian: {result.durationInSeconds} giây</p>
          </div>
        ) : <h3 className="font-display text-2xl font-semibold text-ink">{queueing ? "Đang tìm đối thủ" : "Bạn đã sẵn sàng?"}</h3>}
        <p className="max-w-xl text-sm leading-7 text-slate">{queueing
          ? "Đang tìm người chơi cùng HSK " + level + ". Bạn có thể hủy tìm trận bất cứ lúc nào."
          : "Thi đấu trực tiếp với người chơi cùng HSK trên web. Hai bạn sẽ luân phiên trả lời và cùng nhận kết quả khi hết trận."}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {queueing ? <button type="button" className="hsk-button-secondary" disabled={busy} onClick={() => { void command("cancel_match"); }}>Hủy tìm trận</button>
            : <button type="button" className="hsk-button min-h-12 px-6" disabled={!ready || busy} onClick={() => { void command("find_match"); }}><Swords size={18} />{result ? "Đấu ván nữa" : "Bắt đầu tìm người"}</button>}
          {result && <button type="button" className="hsk-button-secondary" onClick={() => { setResult(null); setMatch(null); setAnswer(null); setSubmittedQuestion(null); }}>Về sảnh</button>}
        </div>
      </div>
    )}

    {match && <><div className="grid grid-cols-2 gap-3">{match.players.map(player => { const score = match.scores.find(item => item.userId === player.id); return <div className={`rounded-lg border p-4 ${player.id === userId ? "border-brand/30 bg-brand/5" : "border-mist"}`} key={player.id}><div className="flex items-center gap-2">{player.photoUrl && <img src={publicMedia(player.photoUrl) || undefined} className="h-8 w-8 rounded-full object-cover" alt="" />}<p className="text-sm font-medium text-ink">{player.name}{player.id === userId ? " (Bạn)" : ""}</p></div><p className="mt-3 text-2xl font-semibold text-brand">{score?.score ?? 0} <span className="text-xs font-normal text-slate">điểm</span></p><p className="mt-1 text-xs text-slate">Đúng {score?.correctCount ?? 0} câu</p></div>; })}</div>
      {match.stage === "waiting" && !result && <div className="flex flex-wrap items-center gap-4"><p className="text-sm text-slate">Xác nhận sẵn sàng trong {seconds} giây.</p><button type="button" className="hsk-button" disabled={!ready || busy || match.readyUserIds.includes(userId)} onClick={() => { void command("player_ready", { roomId: match.roomId }); }}><Check size={16} />{match.readyUserIds.includes(userId) ? "Đã sẵn sàng · Chờ đối thủ" : "Tôi đã sẵn sàng"}</button></div>}
      {!result && current && (match.stage === "playing" || match.stage === "reveal") && <><div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-slate">Câu {match.index + 1} / {match.questions.length} · {myTurn ? "Lượt của bạn" : "Lượt của đối thủ"}</span><span className="font-semibold text-brand">{seconds} giây</span></div><div className="rounded-lg bg-paper p-5 text-center"><p className="text-sm text-slate">{current.prompt}</p><p className="hsk-hanzi mt-3 text-ink" lang="zh-CN">{current.hanzi}</p><p className="mt-1 text-base text-brand">{current.pinyin}</p></div><div className="grid gap-3 sm:grid-cols-2">{current.options.map(option => <button type="button" key={option.id} disabled={!ready || busy || !myTurn || match.stage !== "playing" || seconds <= 0 || submittedQuestion === current.id} onClick={() => { setSubmittedQuestion(current.id); void command("submit_answer", { roomId: match.roomId, questionId: current.id, optionId: option.id }); }} className={`min-h-14 rounded-lg border p-4 text-left text-sm leading-6 transition disabled:cursor-default ${answer?.questionId === current.id && answer.correctOptionId === option.id ? "border-success bg-success-soft text-success" : "border-mist text-ink enabled:hover:border-brand enabled:hover:bg-brand/5"}`}><span className="mr-2 font-semibold">{option.id}.</span>{option.text}</button>)}</div>{answer?.questionId === current.id && <p className="hsk-notice">{answer.optionId === null ? "Đã hết thời gian." : answer.correct ? "Câu trả lời chính xác." : "Câu trả lời chưa đúng."} Đáp án: {answer.correctOptionId}.</p>}</>}
    </>}
  </section>;
}
