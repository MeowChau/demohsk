import { NavigationLink as Link } from "@/components/shell/navigation-protection";
import { SKILL_LABELS } from "@/lib/hsk";
import { formatScore } from "@/lib/utils";
import { publicMedia } from "@/lib/api/config";
import { imageRegionSchema, type QuestionImageRegion } from "@/lib/api/question-adapter";
import { QuestionImage, optionDisplayText } from "./question-content";
import { attemptHref } from "@/lib/attempt-routes";
import { HskBadge } from "@/components/ui/catalog";
import { SharedAudioSection } from "./shared-audio-section";
import { historyDate, historyDuration, historyHref, historyMetric, historyOptions, historyText, type AttemptHistoryDetail, type HistorySourceItem } from "@/lib/learning-history";
import { optionMatchesAnswer } from "@/lib/practice-scoring";
import { writingPractice } from "@/lib/writing-practice";
import { WritingErrorTable, SpeakingErrorTable } from "./attempt/skill-error-summary";
import type { Skill } from "@/types/assessment";

const audioFor = (item: HistorySourceItem) => publicMedia(historyText(item.question?.payload.audioUrl)) || publicMedia(item.audioUrl) || "";
function ReviewImage({ url, alt, region }: { url: string; alt: string; region?: QuestionImageRegion }) {
  const src = publicMedia(url);
  if (!src) return null;
  return <a href={src} target="_blank" rel="noreferrer" aria-label={"Mở ảnh: " + alt} className="mt-3 block"><QuestionImage src={src} alt={alt} region={region} className="mx-auto h-auto max-w-full rounded-lg object-contain" /></a>;
}
function QuestionReview({ item, number, detail, sharedAudio, grade }: { item: HistorySourceItem; number: number; detail: AttemptHistoryDetail; sharedAudio: boolean; grade?: AttemptHistoryDetail["result"]["questions"][number] }) {
  const question = item.question;
  const payload = question?.payload || {};
  const parsedRegion = imageRegionSchema.safeParse(payload.imageRegion);
  const id = String(item.id);
  const answer = detail.snapshot.answers[id] || "";
  const expected = grade?.correctAnswers || [];
  const options = historyOptions(item);
  const usesTextAnswer = options.length === 0 || question?.type === "ESSAY";
  const speech = detail.snapshot.speakingAssessments[id];
  const tracing = detail.snapshot.writingProgress[id];
  const status = grade?.status;
  const sourceMetadata = payload.source && typeof payload.source === "object" ? payload.source as Record<string, unknown> : {};
  const speechTarget = [payload.character, payload.hanzi, sourceMetadata.sourceWord, payload.sentence, payload.text, payload.questionText].find((value): value is string => typeof value === "string" && /\p{Script=Han}/u.test(value));
  const prompt = historyText(payload.text) || historyText(payload.character) || historyText(payload.hanzi) || historyText(payload.sentence) || "Nội dung câu hỏi chưa có trong bản lưu.";
  const matches = (option: typeof options[number], value: string) => optionMatchesAnswer(option, value, question?.type);
  const feedback = speech ? { text: `Điểm phát âm: ${formatScore(speech.score)}/100`, style: "border-brand/20 bg-brand/5 text-brand" }
    : tracing ? { text: `Đúng ${tracing.correctStrokes}/${tracing.totalStrokes} nét đã mở · ${tracing.mistakes} lượt nét cần cải thiện · hoàn thành ${tracing.completedPositions.length}/${tracing.totalCharacters} chữ.`, style: "border-brand/20 bg-brand/5 text-brand" }
      : status === "correct" ? { text: "Chính xác", style: "border-success bg-success-soft text-success" }
        : status === "incorrect" ? { text: "Chưa chính xác", style: "border-danger bg-danger-soft text-danger" }
          : status === "unanswered" ? { text: "Chưa trả lời", style: "border-brand/20 bg-brand/5 text-brand" }
            : { text: question?.skill === "SPEAKING" ? "Câu này chưa có kết quả chấm phát âm trong lượt đã lưu." : "Mục tự luyện hoặc chưa chấm tự động.", style: "border-mist bg-paper text-slate" };
  const correctText = expected.map(value => { const option = options.find(entry => matches(entry, value)); return option ? `${option.id}. ${option.text === option.id ? "" : optionDisplayText(option.text)}`.trim() : value; }).join(" / ");
  const skill = (question?.skill?.slice(0, 1) + (question?.skill?.slice(1).toLowerCase() || "")) as Skill;
  return <article id={"history-question-" + id} className="hsk-panel min-w-0 scroll-mt-24">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-brand">Câu {number}</h3><span className="text-xs text-slate">{SKILL_LABELS[skill] || question?.skill || "Bài luyện"}</span></div>
    <p className="whitespace-pre-line text-sm font-medium leading-7 text-ink">{prompt}</p>
    {question?.skill === "SPEAKING" && speechTarget && speechTarget !== prompt && <p lang="zh-CN" className="hsk-hanzi mt-3 text-ink">{historyText(speechTarget)}</p>}
    {historyText(payload.pinyin) && <p className="mt-2 text-sm text-slate">{historyText(payload.pinyin)}</p>}
    {(historyText(payload.translation) || historyText(payload.meaning)) && <p className="mt-2 text-sm text-slate">{historyText(payload.translation) || historyText(payload.meaning)}</p>}
    {[
      { url: historyText(payload.contextImageUrl) },
      { url: historyText(payload.imageUrl), region: parsedRegion.success ? parsedRegion.data : undefined },
      { url: historyText(payload.continuationImageUrl) },
    ].filter(image => image.url).map((image, index) => <ReviewImage key={index} url={image.url} region={image.region} alt={`Hình câu ${number}, phần ${index + 1}`} />)}
    {!sharedAudio && audioFor(item) && <audio controls preload="none" src={publicMedia(audioFor(item)) || undefined} aria-label={`Âm thanh câu ${number}`} className="mt-4 w-full" />}
    {!speech && !tracing && question?.skill !== "SPEAKING" && (!usesTextAnswer ? <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {options.map(option => {
        const selected = Boolean(answer) && matches(option, answer);
        const correct = expected.some(value => matches(option, value));
        const color = correct ? "border-success bg-success-soft" : selected && status === "incorrect" ? "border-danger bg-danger-soft" : selected ? "border-brand bg-brand/5" : "border-mist";
        return <div key={option.id} className={`min-w-0 rounded-lg border p-4 text-sm text-ink ${color}`} aria-label={`Đáp án ${option.id}${selected ? ", đã chọn" : ""}${correct ? ", đúng" : ""}`}>
          <div className="flex items-start gap-3"><span aria-hidden="true" className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? "border-brand" : "border-slate-soft"}`}>{selected && <span className="h-2 w-2 rounded-full bg-brand" />}</span><p className="flex min-w-0 flex-1 items-start gap-3 leading-6"><strong className="w-6 shrink-0 text-brand">{option.id}.</strong><span className="min-w-0 flex-1 whitespace-pre-line break-words">{option.text === option.id ? "" : optionDisplayText(option.text)}{selected && <span className="sr-only"> (Đã chọn)</span>}</span></p></div>
          {option.imageUrl && <ReviewImage url={option.imageUrl} alt={`Đáp án ${option.id}`} />}
        </div>;
      })}
    </div> : <>{options.length > 0 && <p className="mt-4 rounded-lg bg-paper p-3 text-sm text-slate">Từ gợi ý: {options.map(option => option.text).join(" · ")}</p>}<div className="mt-4 rounded-lg border border-mist bg-paper p-4"><p className="text-xs font-semibold text-slate">Câu trả lời của bạn</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-ink">{answer || "Chưa trả lời"}</p></div></>)}
    <div className={`mt-4 rounded-lg border px-3 py-2 text-sm leading-6 ${feedback.style}`}><p>{feedback.text}</p>{correctText && status !== "correct" && <p className="mt-1">Đáp án: {correctText}</p>}</div>
    {speech && <div className="mt-3 space-y-2 text-sm text-slate"><p>Nhận diện: {speech.recognizedText || "—"}</p><p>{speech.feedback}</p><p>Phát âm {formatScore(speech.accuracyScore)}/100 · Trôi chảy {formatScore(speech.fluencyScore)}/100 · Đầy đủ {formatScore(speech.completenessScore)}/100</p><p className="text-xs">Kết quả đã lưu không bao gồm tệp giọng nói để phát lại.</p></div>}
  </article>;
}

export function AttemptHistoryReview({ detail, filter }: { detail: AttemptHistoryDetail; filter: string }) {
  const items = detail.snapshot.source.items;
  const tracingTargets = items.flatMap(item => {
    const question = item.question;
    if (question?.skill !== "WRITING") return [];
    const payload = question.payload;
    const target = writingPractice({ skill: "Writing", type: question.type,
      templateId: historyText(payload.templateId),
      question: historyText(payload.text) || historyText(payload.character) || historyText(payload.hanzi) });
    return target?.text ? [{ id: String(item.id), text: target.text, pinyin: historyText(payload.pinyin) }] : [];
  });
  // Build lookup tables once instead of scanning all grades for every question.
  const grades = new Map(detail.result.questions.map(grade => [grade.questionId, grade]));
  const wrongIds = new Set(detail.result.questions.filter(grade => ["incorrect", "unanswered"].includes(grade.status)).map(grade => grade.questionId));
  const isWrong = (item: HistorySourceItem) => wrongIds.has(String(item.id));
  const displayed = filter === "wrong" ? items.filter(isWrong) : items;
  const displayedIds = new Set(displayed.map(item => item.id));
  const groups: { audio: string; items: { item: HistorySourceItem; number: number }[] }[] = [];
  items.forEach((item, index) => { const audio = audioFor(item); const previous = groups.at(-1); if (audio && previous?.audio === audio) previous.items.push({ item, number: index + 1 }); else groups.push({ audio, items: [{ item, number: index + 1 }] }); });
  return <div className="flex flex-col gap-6">
    <Link href={historyHref({ kind: detail.kind, sourceId: String(detail.sourceId) })} className="w-fit text-sm font-medium text-brand">← Lịch sử bài làm</Link>
    <div className="hsk-panel space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><HskBadge level={detail.hskLevel} /><h1 className="mt-3 font-display text-2xl font-semibold text-ink">{detail.title}</h1><p className="mt-2 text-sm text-slate">{historyDate(detail.submittedAt)} · {historyDuration(detail.durationSeconds)}</p></div><Link href={attemptHref(detail.kind + "-" + detail.sourceId)} className="hsk-button">Làm lại bài này</Link></div>
      <p className="text-2xl font-semibold text-brand">{historyMetric(detail)}</p>{(detail.gradedCount > 0 || detail.ungradedCount > 0) && <p className="text-sm text-slate">Đúng {detail.correctCount} · Sai {detail.result.questions.filter(grade => grade.status === "incorrect").length} · Bỏ trống {detail.unansweredCount} · {detail.ungradedCount} câu chưa chấm tự động</p>}
      {detail.kind === "exam" && detail.totalScore !== null && <p className="text-sm font-semibold text-ink">Điểm HSK: {formatScore(detail.totalScore)}/{detail.maxScore} · {detail.passed ? "Đạt ngưỡng" : "Chưa đạt ngưỡng"}</p>}
      {detail.result.sections.length > 0 && <div className="flex flex-wrap gap-3">{detail.result.sections.map(section => <p className="text-sm text-slate" key={section.skill}>{SKILL_LABELS[section.skill]}: {section.score === null ? "Chưa chấm" : formatScore(section.score) + "/100"}</p>)}</div>}
      {detail.writingProgress.total > 0 && <p className="text-sm text-slate">Luyện nét: {detail.writingProgress.correctStrokes}/{detail.writingProgress.totalStrokes} nét đúng · {detail.writingProgress.mistakes} lượt cần cải thiện · hoàn thành {detail.writingProgress.completed}/{detail.writingProgress.total} chữ.</p>}
      {detail.speaking.totalCount > 0 && <p className="text-sm text-slate">Phát âm: {detail.speaking.score === null ? "Chưa có điểm" : formatScore(detail.speaking.score) + "/100"} · {detail.speaking.gradedCount}/{detail.speaking.totalCount} câu đã chấm.</p>}
      {detail.reasons.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-slate">{detail.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
      <p className="text-xs leading-6 text-slate">Bản bài làm được lưu tại thời điểm nộp. Xem lại không thay đổi điểm hoặc mức HSK. Làm lại mở nội dung hiện hành trong một lượt mới.</p>
    </div>
    {(detail.writingProgress.total > 0 || detail.speaking.totalCount > 0) && <section className="hsk-panel min-w-0 space-y-4" aria-label="Thống kê lỗi trong bài làm đã lưu">
      <h2 className="hsk-section-title">Từ và âm cần luyện lại</h2>
      {detail.writingProgress.total > 0 && <div className="rounded-lg border border-mist p-4"><h3 className="font-semibold text-ink">Kết quả luyện viết</h3><WritingErrorTable targets={tracingTargets} progress={detail.snapshot.writingProgress} /></div>}
      {detail.speaking.totalCount > 0 && <div className="rounded-lg border border-mist p-4"><h3 className="font-semibold text-ink">Kết quả luyện nói</h3><SpeakingErrorTable assessments={detail.snapshot.speakingAssessments} /></div>}
    </section>}
    <div className="flex flex-wrap items-center gap-3"><h2 className="mr-auto text-lg font-semibold text-ink">Xem lại bài làm</h2><Link href={"/results/" + detail.id} className={filter !== "wrong" ? "hsk-button" : "hsk-button-secondary"}>Tất cả ({items.length})</Link><Link href={"/results/" + detail.id + "?filter=wrong"} className={filter === "wrong" ? "hsk-button" : "hsk-button-secondary"}>Câu sai, bỏ trống ({items.filter(isWrong).length})</Link></div>
    <p className="text-xs text-slate">Bấm vào hình để mở ảnh đầy đủ. Tỷ lệ đúng chỉ tính trên câu có thể chấm tự động; điểm HSK hiển thị riêng.</p>
    {displayed.length === 0 && <div className="hsk-panel text-sm text-slate">Không có câu sai hoặc bỏ trống trong nhóm câu đã chấm.</div>}
    {groups.map((group, index) => { const shown = group.items.filter(({ item }) => displayedIds.has(item.id)); if (!shown.length) return null; const blocks = shown.map(({ item, number }) => <QuestionReview key={item.id} item={item} number={number} detail={detail} grade={grades.get(String(item.id))} sharedAudio={Boolean(group.audio) && group.items.length > 1} />); return group.audio && group.items.length > 1 ? <SharedAudioSection key={index} src={publicMedia(group.audio) || group.audio} label={`Câu ${group.items[0]!.number}–${group.items.at(-1)!.number}`}>{blocks}</SharedAudioSection> : <div key={index} className="flex flex-col gap-5">{blocks}</div>; })}
  </div>;
}
