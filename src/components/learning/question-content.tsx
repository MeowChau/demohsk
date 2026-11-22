import type { HskQuestion } from "@/lib/api/types";
import { publicMedia } from "@/lib/api/config";
import type { QuestionImageRegion } from "@/lib/api/question-adapter";

export function optionDisplayText(value: string): string {
  // Hide generated headings without changing the values used for grading.
  return value.replace(/^[ \t]*Hội thoại[ \t]+\d+[ \t]*\r?\n(?=[ \t]*A[ \t]*[:：])/iu, "");
}

export function QuestionImage({ src, alt, className, region }: {
  src?: string | null; alt: string; className?: string; region?: QuestionImageRegion;
}) {
  if (!src) return null;
  if (!region) return <img src={src} alt={alt} className={className} loading="lazy" />;
  // Display just this item's picture while preserving the original source file.
  return <div className={"relative overflow-hidden " + (className || "")}
    style={{ width: "100%", maxWidth: region.width, aspectRatio: `${region.width} / ${region.height}` }}>
    <img src={src} alt={alt} loading="lazy" width={region.sourceWidth} height={region.sourceHeight}
      style={{ position: "absolute", maxWidth: "none", width: `${region.sourceWidth / region.width * 100}%`, height: "auto",
        left: `${-region.x / region.width * 100}%`, top: `${-region.y / region.height * 100}%` }} />
  </div>;
}
export function QuestionContent({ question }: { question: HskQuestion }) {
  const { payload } = question;
  return <div className="flex flex-col gap-3"><p className="whitespace-pre-line text-base leading-8 text-ink" lang="zh-CN">{payload.text || "Đọc nội dung và trả lời câu hỏi."}</p>{payload.pinyin && <p className="text-sm text-brand">{payload.pinyin}</p>}{payload.translation && <p className="text-sm leading-6 text-slate">{payload.translation}</p>}{[
    { url: payload.contextImageUrl }, { url: payload.imageUrl, region: payload.imageRegion }, { url: payload.continuationImageUrl },
  ].filter(item => item.url).map((item, index) => <QuestionImage key={index} src={publicMedia(item.url)} region={item.region}
    className="max-h-96 max-w-full rounded-lg object-contain" alt={`Hình minh họa câu ${question.id}, phần ${index + 1}`} />)}{payload.audioUrl && <audio className="w-full" controls preload="none" src={publicMedia(payload.audioUrl) || undefined} aria-label="Âm thanh câu hỏi" />}</div>;
}
