"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Swords, RefreshCw, Check, Search, LogOut, LoaderCircle } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { publicMedia } from "@/lib/api/config";
import { HskBadge } from "@/components/ui/catalog-badge";
import { useBlockNavigation } from "@/components/shell/navigation-protection";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { parsePkMessage, pkStorageKey, validPkRoom } from "@/types/pk";
import type { PkMatch, PkResult, PkAnswer, PkCommand } from "@/types/pk";

export function PkArena({ userId, level, backendOrigin, autoMatch = false }: { userId: number; level: number; backendOrigin: string; autoMatch?: boolean }) {
  const [ready, setReady] = useState(false);
  const [expMultiplier, setExpMultiplier] = useState<number | null>(null);
  const [queueing, setQueueing] = useState(false);
  const [busy, setBusy] = useState(false);
  const commandBusy=useRef(false);
  const autoMatchRequested=useRef(false);
  const participating=useRef(false);
  const exitSent=useRef(false);
  const [leaveConfirmation, setLeaveConfirmation] = useState(false);
  const pendingLeave = useRef<(() => void) | null>(null);
  const [online, setOnline] = useState<number | null>(null);
  const [match, setMatch] = useState<PkMatch | null>(null);
  const [result, setResult] = useState<PkResult | null>(null);
  const [answer, setAnswer] = useState<PkAnswer | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<{ roomId: string; questionId: number; optionId: string } | null>(null);
  const [submittedQuestion, setSubmittedQuestion] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [expiredDeadline, setExpiredDeadline] = useState<number | null>(null);
  const latestMatch = useRef<PkMatch | null>(null);
  const reconnect = useRef<(retry?:boolean)=>Promise<void>>(async()=>{});
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryCount=useRef(0);
  const connectedAt=useRef(0);
  const offset = useRef(0);
  const events = useRef<EventSource | null>(null);
  const alive = useRef(true);
  const generation = useRef(0);
  const router = useRouter();
  const storageKey = pkStorageKey(backendOrigin,userId,level);

  const post = useCallback(async (event: PkCommand["event"], payload: Partial<PkCommand> = {}) => {
    const response = await fetch("/api/pk", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, hskLevel: level, ...payload }) });
    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.message || "Chưa gửi được thao tác PK.");
    return data as { ok: boolean; result?: unknown };
  }, [level]);
  const finishResult = useCallback((incoming: PkResult) => {
    if (!incoming.users.includes(userId)) return;
    const previous = latestMatch.current;
    if (previous && (previous.roomId !== incoming.roomId || previous.revision > incoming.revision)) return;
    participating.current=false;
    const finished = { ...incoming, questions: previous?.questions || [] };
    latestMatch.current=finished; setMatch(finished); setResult(incoming); setQueueing(false);
    try { sessionStorage.removeItem(storageKey); } catch { /* Optional storage. */ }
    router.refresh();
  }, [userId, storageKey, router]);
  const sendExit = useCallback(() => {
    if (!participating.current || exitSent.current) return;
    exitSent.current=true; participating.current=false;
    const roomId = latestMatch.current?.roomId;
    try { sessionStorage.removeItem(storageKey); } catch { /* Optional storage. */ }
    // Keepalive survives a route change or tab close. The backend finalizes the room atomically.
    void fetch("/api/pk", { method: "POST", keepalive: true, credentials: "same-origin",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "cancel_match", hskLevel: level, ...(roomId ? { roomId } : {}) })
    }).catch(() => { /* Socket disconnect is the server-side fallback. */ });
  }, [level, storageKey]);
  const connect = useCallback(async (retry = false) => {
    if(retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current=undefined;
    if(!retry) retryCount.current=0;
    const currentGeneration = ++generation.current;
    events.current?.close(); setReady(false); setExpMultiplier(null); setError("");
    const scheduleRetry = () => {
      if(!alive.current || generation.current!==currentGeneration || retryTimer.current) return;
      if(connectedAt.current && Date.now()-connectedAt.current>=30000) retryCount.current=0;
      connectedAt.current=0;
      if(retryCount.current>=5) return;
      const delay=Math.min(16000,1000*2**retryCount.current++);
      retryTimer.current=setTimeout(()=>{retryTimer.current=undefined;void reconnect.current(true);},delay);
    };
    try {
      await apiFetch("auth/me");
      if (!alive.current || generation.current !== currentGeneration) return;
      let savedRoom = "";
      try { savedRoom = validPkRoom(sessionStorage.getItem(storageKey)) || ""; } catch { /* Storage is optional. */ }
      const query = new URLSearchParams({ hskLevel: String(level), ...(savedRoom ? { roomId: savedRoom } : {}) });
      const stream = new EventSource("/api/pk?" + query);
      events.current = stream;
      stream.onmessage = message => {
        if (!alive.current || generation.current !== currentGeneration) return;
        let raw:unknown;
        try {raw=JSON.parse(message.data);} catch {return;}
        const envelope=parsePkMessage(raw);if(!envelope || envelope.event==="connecting") return;
        if (envelope.event === "match_cancelled") { if(latestMatch.current?.roomId && latestMatch.current.roomId!==envelope.payload.roomId) return; participating.current=false; setQueueing(false); latestMatch.current=null; setMatch(null); setResult(null); setAnswer(null); setSelectedChoice(null); setSubmittedQuestion(null); setError(String(("message" in envelope.payload ? envelope.payload.message : undefined) || "Trận đấu đã được hủy.")); try { sessionStorage.removeItem(storageKey); } catch {} return; }
        if("roomId" in envelope.payload){
          const update=envelope.payload, previous=latestMatch.current;
          if(!update.users.includes(userId)) return;
          if(previous?.roomId===update.roomId && previous.revision>update.revision) return;
          if(previous && previous.roomId!==update.roomId && envelope.event!=="match_found") return;
          const questions="questions" in update && update.questions ? update.questions : previous?.roomId===update.roomId ? previous.questions : [];
          if(!questions.length) return;
          const incoming:PkMatch={...update,questions};
          latestMatch.current=incoming;setMatch(incoming);
          if (incoming.stage !== "finished") participating.current=true;
          offset.current=incoming.serverNow-Date.now();
        }
        if (envelope.event === "pk_connected") {
          connectedAt.current=Date.now(); setReady(true); setOnline(envelope.payload.count); setExpMultiplier(envelope.payload.expMultiplier ?? null);
          if (savedRoom) { autoMatchRequested.current=true; const roomId = savedRoom; savedRoom = ""; void post("find_match", { roomId }).catch(cause => setError(cause.message)); }
          return;
        }
        if (envelope.event === "online_count_update") { if (envelope.payload.hskLevel === level) setOnline(envelope.payload.count); return; }
        if (["connection_closed", "connection_error", "exception"].includes(envelope.event)) {
          setError(String(("message" in envelope.payload ? envelope.payload.message : undefined) || "Kết nối PK chưa sẵn sàng.")); setQueueing(false);
          if (envelope.event !== "exception") { setReady(false); stream.close(); scheduleRetry(); }
          return;
        }

        if (envelope.event === "match_found") { participating.current=true; exitSent.current=false; setQueueing(false); setResult(null); setAnswer(null); setSelectedChoice(null); setSubmittedQuestion(null); setError(""); try { sessionStorage.setItem(storageKey, "roomId" in envelope.payload ? envelope.payload.roomId : ""); } catch {} }
        if (envelope.event === "game_started" || envelope.event === "turn_changed") { setQueueing(false); setAnswer(null); setSelectedChoice(null); setSubmittedQuestion(null); }
        if (envelope.event === "answer_result") setAnswer(envelope.payload);
        if (envelope.event === "game_finished") finishResult(envelope.payload);
      };
      stream.onerror = () => { if (!alive.current || generation.current !== currentGeneration) return; stream.close(); setReady(false); setQueueing(false); setError("Kết nối PK bị gián đoạn. Hệ thống đang thử kết nối lại; bạn cũng có thể bấm Kết nối lại."); scheduleRetry(); };
    } catch (cause) {
      if (alive.current && generation.current===currentGeneration){setError(cause instanceof Error ? cause.message : "Chưa kết nối được phòng PK.");
        if(!(cause instanceof ApiError && [401,403].includes(cause.status))) scheduleRetry();
      }
    }
  }, [level, post, storageKey, userId, finishResult]);
  reconnect.current=connect;
  useEffect(() => {
    alive.current=true;void connect();
    const onPageHide = () => { sendExit(); events.current?.close(); };
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      latestMatch.current=null; setMatch(null); setResult(null); setQueueing(false);
      void connect(); router.refresh();
    };
    window.addEventListener("pagehide",onPageHide);
    window.addEventListener("pageshow",onPageShow);
    return ()=>{sendExit();alive.current=false;generation.current++;events.current?.close();if(retryTimer.current)clearTimeout(retryTimer.current);window.removeEventListener("pagehide",onPageHide);window.removeEventListener("pageshow",onPageShow);};
  },[connect,sendExit,router]);
  const command = useCallback(async (event: PkCommand["event"], payload: Partial<PkCommand> = {}) => {
    if (commandBusy.current) return false;
    commandBusy.current=true;
    setBusy(true); setError("");
    if (event === "find_match") { participating.current=true; exitSent.current=false; setQueueing(true); latestMatch.current=null; setResult(null); setMatch(null); setAnswer(null); setSelectedChoice(null); setSubmittedQuestion(null); }
    try {
      const reply = await post(event, payload);
      if (event === "cancel_match") {
        participating.current=false; setQueueing(false);
        const finished = reply.result ? parsePkMessage({event:"game_finished",payload:reply.result}) : null;
        if (finished?.event === "game_finished") finishResult(finished.payload);
        else if (!latestMatch.current || latestMatch.current.stage === "waiting") { latestMatch.current=null; setMatch(null); }
      }
      return true;
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Thao tác chưa thành công."); if (event === "find_match") { participating.current=false; setQueueing(false); } if (event === "submit_answer") setSubmittedQuestion(null); return false; }
    finally { commandBusy.current=false; setBusy(false); }
  }, [post, finishResult]);
  useEffect(() => {
    if (!autoMatch || !ready || autoMatchRequested.current || participating.current || latestMatch.current) return;
    autoMatchRequested.current=true;
    void command("find_match");
  }, [autoMatch, ready, command]);
  const inMatch = Boolean(match && !result);
  const lockLevel = queueing || inMatch;
  // A disconnected queue still needs an explicit cancellation before leaving.
  const protectSession = lockLevel || (!result && participating.current);
  useBlockNavigation(protectSession, proceed => {
    pendingLeave.current=proceed;
    setLeaveConfirmation(true);
  });
  useEffect(() => {
    if (!protectSession) {
      pendingLeave.current=null;
      setLeaveConfirmation(false);
      return;
    }
    // Tab switching cannot be cancelled. Ask on return without forfeiting or pausing the server clock.
    let switchedAway=document.visibilityState === "hidden";
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") switchedAway=true;
      else if (switchedAway) {
        switchedAway=false;
        if (participating.current) setLeaveConfirmation(true);
      }
    };
    document.addEventListener("visibilitychange",onVisibilityChange);
    return () => document.removeEventListener("visibilitychange",onVisibilityChange);
  },[protectSession]);
  function requestExit() {
    pendingLeave.current=null;
    setLeaveConfirmation(true);
  }
  function stayInMatch() {
    if (commandBusy.current) return;
    pendingLeave.current=null;
    setLeaveConfirmation(false);
  }
  async function confirmExit() {
    if (commandBusy.current) return;
    const proceed=pendingLeave.current;
    const roomId=latestMatch.current?.roomId;
    if (participating.current && !await command("cancel_match", roomId ? {roomId} : {})) return;
    pendingLeave.current=null;
    setLeaveConfirmation(false);
    if (proceed) proceed();
    else if (autoMatch && !latestMatch.current) router.replace("/games?hskLevel=" + level);
  }
  const leavingRoom = match?.stage === "waiting";
  const leavingQueue = !match;
  const current = match?.questions?.[match.index];
  const expired = expiredDeadline===match?.deadline || (match?.deadline || 0)<=Date.now()+offset.current;
  const myTurn = match?.turnUserId === userId;
  const rewardDetails = result?.rewards?.find(reward => reward.userId === userId);
  const myReward = rewardDetails?.expAwarded;
  const currentAnswer = answer && answer.roomId === match?.roomId && answer.questionId === current?.id ? answer : null;
  const selectedOptionId = currentAnswer ? currentAnswer.optionId
    : selectedChoice && selectedChoice.roomId === match?.roomId && selectedChoice.questionId === current?.id ? selectedChoice.optionId : null;
  const autoConnecting = autoMatch && !match && !result && !queueing && !error && (!ready || !autoMatchRequested.current);
  const feedbackStyle = currentAnswer?.optionId === null ? "border-brand/20 bg-brand/5 text-brand"
    : currentAnswer?.correct ? "border-success bg-success-soft text-success" : "border-danger bg-danger-soft text-danger";
  return <section className="hsk-panel flex flex-col gap-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="hsk-section-title">{result ? "Kết quả trận đấu" : inMatch ? match?.stage === "waiting" ? "Chuẩn bị thi đấu" : "Đang thi đấu PK" : "Phòng PK"}</h2><span className={`rounded-full px-3 py-1 text-xs font-medium ${ready ? "bg-success-soft text-success" : "bg-mist text-slate"}`}>{ready ? `Đã kết nối · ${online ?? "—"} học viên online` : "Chưa kết nối"}</span></div>
    {inMatch && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mist pb-4"><div><p className="text-sm font-medium text-ink">HSK {level}{expMultiplier !== null && <span className="ml-2 text-brand">· EXP ×{expMultiplier.toLocaleString("vi-VN")}</span>}</p><p className="mt-1 text-xs text-slate">{match?.stage === "waiting" ? "Xác nhận sẵn sàng để bắt đầu" : "Rời trận sẽ tính bỏ cuộc."}</p></div><button type="button" className="hsk-button-secondary" disabled={busy} onClick={requestExit}><LogOut size={16} />{match?.stage === "waiting" ? "Rời phòng" : "Rời trận"}</button></div>}
    {!inMatch && !result && <div className="flex flex-wrap items-center gap-3 border-b border-mist pb-4"><HskBadge level={level} /><p className="text-xs text-slate">Chỉ ghép với người chơi cùng mức HSK hiện tại trong hồ sơ.</p></div>}
    {!inMatch && !result && expMultiplier !== null && <p className="text-sm text-slate">Thưởng EXP HSK {level}: <strong className="text-brand">×{expMultiplier.toLocaleString("vi-VN")}</strong>. Áp dụng cho trận hoàn thành có trả lời; EXP được làm tròn đến số nguyên.</p>}
    {error && !leaveConfirmation && <p className="hsk-error" role="alert">{error}</p>}
    {!ready && (!autoMatch || error) && <button type="button" className="hsk-button-secondary w-fit" onClick={() => { void connect(); }}><RefreshCw size={16} />Kết nối lại</button>}
    {autoConnecting && <div className="flex flex-col items-center gap-4 rounded-lg bg-paper px-4 py-10 text-center" role="status"><LoaderCircle className="text-brand motion-safe:animate-spin" size={30} aria-hidden="true" /><h3 className="text-xl font-semibold text-ink">Đang kết nối phòng PK</h3><p className="text-sm leading-6 text-slate">Hệ thống sẽ tìm đối thủ HSK {level} ngay khi kết nối sẵn sàng.</p></div>}
    {(!match || result) && !autoConnecting && (
      <div className="flex flex-col items-center gap-5 rounded-lg bg-paper px-4 py-8 text-center sm:px-6">
        {queueing && <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand" aria-hidden="true">
          <Search size={28} className="motion-safe:animate-pulse" />
        </div>}
        {result ? (
          <div className="w-full rounded-lg border border-brand/20 bg-brand/5 p-5">
            <h3 className="text-xl font-semibold text-ink">{result.winnerId === null ? "Hai bạn hòa nhau" : result.winnerId === userId ? "Bạn đã thắng!" : "Đối thủ đã chiến thắng"}</h3>
            <p className="mt-2 text-sm text-slate">EXP nhận được: <strong className="text-brand">{myReward === undefined ? "Đang cập nhật" : "+" + myReward + " EXP"}</strong> · Thời gian: {result.durationInSeconds} giây</p>
            {result.reason === "forfeit" && <p className="mt-2 text-sm text-slate">Trận kết thúc do một người rời trận. Điểm đã trả lời và kết quả đã được lưu vào lịch sử. Trận bỏ cuộc không nhận EXP.</p>}
            {rewardDetails?.baseExp !== undefined && rewardDetails.expMultiplier !== undefined && rewardDetails.expAwarded > 0 && <p className="mt-1 text-xs text-slate">{rewardDetails.baseExp} EXP gốc ×{rewardDetails.expMultiplier.toLocaleString("vi-VN")} · HSK {rewardDetails.hskLevel ?? level} → {rewardDetails.expAwarded} EXP (làm tròn).</p>}
          </div>
        ) : <h3 className="font-display text-2xl font-semibold text-ink">{queueing ? "Đang tìm đối thủ" : autoMatch ? "Ghép trận chưa sẵn sàng" : "Bạn đã sẵn sàng?"}</h3>}
        {!result && <p className="max-w-xl text-sm leading-7 text-slate">{queueing
          ? "Đang tìm người chơi cùng HSK " + level + ". Bạn có thể hủy tìm trận bất cứ lúc nào."
          : "Thi đấu trực tiếp với người chơi cùng HSK trên web. Hai bạn sẽ luân phiên trả lời và cùng nhận kết quả khi hết trận."}</p>}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {queueing ? <button type="button" className="hsk-button-secondary enabled:hover:bg-brand enabled:hover:text-white focus-visible:bg-brand focus-visible:text-white" disabled={busy} onClick={requestExit}>Hủy tìm trận</button>
            : <button type="button" className="hsk-button min-h-12 px-6" disabled={!ready || busy} onClick={() => { void command("find_match"); }}><Swords size={18} />{result ? "Đấu ván nữa" : autoMatch ? "Thử ghép lại" : "Bắt đầu tìm người"}</button>}
          {result && <button type="button" className="hsk-button-secondary" onClick={() => { if (autoMatch) { router.replace("/games?hskLevel=" + level); return; } setResult(null); latestMatch.current=null; setMatch(null); setAnswer(null); setSelectedChoice(null); setSubmittedQuestion(null); }}>Về sảnh</button>}
        </div>
      </div>
    )}

    {match && <><div className="grid grid-cols-2 gap-3">{match.players.map(player => { const score = match.scores.find(item => item.userId === player.id); return <div className={`rounded-lg border p-4 ${player.id === userId ? "border-brand/30 bg-brand/5" : "border-mist"}`} key={player.id}><div className="flex items-center gap-2">{player.photoUrl && <img src={publicMedia(player.photoUrl) || undefined} className="h-8 w-8 rounded-full object-cover" alt="" />}<p className="text-sm font-medium text-ink">{player.name}{player.id === userId ? " (Bạn)" : ""}</p></div><p className="mt-3 text-2xl font-semibold text-brand">{score?.score ?? 0} <span className="text-xs font-normal text-slate">điểm</span></p><p className="mt-1 text-xs text-slate">Đúng {score?.correctCount ?? 0} câu</p></div>; })}</div>
      {match.stage === "waiting" && !result && <div className="flex flex-col items-center gap-4 rounded-lg border border-brand/25 bg-brand/5 px-4 py-7 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand" aria-hidden="true"><Swords size={28} /></span><h3 className="text-xl font-semibold text-ink">Đã tìm thấy đối thủ</h3><p className="max-w-md text-sm leading-6 text-slate">Hai người cùng xác nhận sẵn sàng để bắt đầu trận PK. Rời phòng ở bước này sẽ hủy ghép trận.</p><p className="text-sm text-slate">Xác nhận sẵn sàng trong <PkCountdown deadline={match.deadline} offset={offset.current} onExpire={setExpiredDeadline} /> giây.</p><button type="button" className="hsk-button" disabled={!ready || busy || match.readyUserIds.includes(userId)} onClick={() => { void command("player_ready", { roomId: match.roomId }); }}><Check size={16} />{match.readyUserIds.includes(userId) ? "Đã sẵn sàng · Chờ đối thủ" : "Tôi đã sẵn sàng"}</button></div>}
      {!result && current && (match.stage === "playing" || match.stage === "reveal") && <>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-slate">Câu {match.index + 1} / {match.questions.length} · {myTurn ? "Lượt của bạn" : "Lượt của đối thủ"}</span>
          <span className="font-semibold text-brand"><PkCountdown deadline={match.deadline} offset={offset.current} onExpire={setExpiredDeadline} /> giây</span>
        </div>
        <div className="rounded-lg bg-paper p-5 text-center">
          <p className="text-sm text-slate">{current.prompt}</p>
          <p className="hsk-hanzi mt-3 text-ink" lang="zh-CN">{current.hanzi}</p>
          <p className="mt-1 text-base text-brand">{current.pinyin}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {current.options.map(option => {
            const selected = selectedOptionId === option.id;
            const correct = currentAnswer?.correctOptionId === option.id;
            const color = correct ? "border-success bg-success-soft text-success"
              : currentAnswer && selected ? "border-danger bg-danger-soft text-danger"
                : selected ? "border-brand bg-brand/5 text-ink"
                  : "border-control text-ink enabled:hover:border-brand enabled:hover:bg-brand/5";
            return <button type="button" key={option.id} aria-pressed={selected}
              disabled={!ready || busy || !myTurn || match.stage !== "playing" || expired || submittedQuestion === current.id}
              onClick={() => {
                setSelectedChoice({ roomId: match.roomId, questionId: current.id, optionId: option.id });
                setSubmittedQuestion(current.id);
                void command("submit_answer", { roomId: match.roomId, questionId: current.id, optionId: option.id });
              }}
              className={`flex min-h-14 min-w-0 items-start gap-3 rounded-lg border p-4 text-left text-sm leading-6 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-default ${color}`}>
              <span aria-hidden="true" className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected && !currentAnswer ? "border-brand text-brand" : selected || correct ? "border-current" : "border-slate-soft"}`}>
                {selected && <span className="h-2 w-2 rounded-full bg-current" />}
              </span>
              <span className="min-w-0 break-words"><span className="mr-2 font-semibold">{option.id}.</span>{option.text}</span>
            </button>;
          })}
        </div>
        {currentAnswer && <p role="status" aria-live="polite" aria-atomic="true" className={`rounded-lg border px-3 py-2 text-sm leading-6 ${feedbackStyle}`}>
          {currentAnswer.optionId === null ? "Đã hết thời gian." : currentAnswer.correct ? "Câu trả lời chính xác." : "Câu trả lời chưa đúng."} Đáp án: {currentAnswer.correctOptionId}.
        </p>}
      </>}
    </>}
    <ConfirmationDialog open={leaveConfirmation}
      title={leavingQueue ? "Dừng tìm đối thủ?" : leavingRoom ? "Rời phòng PK?" : "Rời trận PK?"}
      cancelLabel={leavingQueue ? "Tiếp tục chờ" : leavingRoom ? "Ở lại phòng" : "Tiếp tục chơi"}
      confirmLabel={busy ? "Đang xử lý…" : leavingQueue ? "Hủy tìm trận" : leavingRoom ? "Rời phòng" : "Rời trận"}
      confirmDisabled={busy} cancelDisabled={busy} onCancel={stayInMatch} onConfirm={() => { void confirmExit(); }}>
      <p>{leavingQueue ? "Bạn đang tìm đối thủ. Rời trang sẽ hủy tìm trận."
        : leavingRoom ? "Hai bạn đã được ghép phòng. Rời phòng sẽ hủy trận đang chuẩn bị, chưa tính điểm."
          : "Rời trận lúc này sẽ tính bỏ cuộc và đối thủ thắng. Điểm đã trả lời và kết quả sẽ được lưu vào lịch sử; trận bỏ cuộc không nhận EXP."}</p>
      {!leavingQueue && !leavingRoom && <p className="mt-2">Trận và thời gian trả lời vẫn tiếp tục khi bạn chuyển sang tab khác.</p>}
      {error && <p className="hsk-error mt-3" role="alert">{error}</p>}
    </ConfirmationDialog>
  </section>;
}

/** A tick updates only this label; the server still owns deadlines and adjudication. */
export function PkCountdown({deadline,offset,onExpire}:{deadline:number;offset:number;onExpire:(deadline:number)=>void}){
  const remaining=()=>Math.max(0,Math.ceil((deadline-Date.now()-offset)/1000));
  const [seconds,setSeconds]=useState(remaining);
  const callback=useRef(onExpire);callback.current=onExpire;
  useEffect(()=>{
    let notified=false;
    const sync=()=>{const value=Math.max(0,Math.ceil((deadline-Date.now()-offset)/1000));setSeconds(value);if(value===0&&!notified){notified=true;callback.current(deadline);}};
    sync();const timer=setInterval(sync,1000);window.addEventListener("focus",sync);
    document.addEventListener("visibilitychange",sync);
    return ()=>{clearInterval(timer);window.removeEventListener("focus",sync);document.removeEventListener("visibilitychange",sync);};
  },[deadline,offset]);
  return <>{seconds}</>;
}
