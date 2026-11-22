import type { HskQuestion } from "@/lib/api/types";
import { publicMedia } from "@/lib/api/config";
export function QuestionContent({ question }: { question: HskQuestion }) {
  const { payload } = question;
  return <div className="flex flex-col gap-3"><p className="whitespace-pre-line text-base leading-8 text-ink" lang="zh-CN">{payload.text || "Đọc nội dung và trả lời câu hỏi."}</p>{payload.pinyin && <p className="text-sm text-brand">{payload.pinyin}</p>}{payload.translation && <p className="text-sm leading-6 text-slate">{payload.translation}</p>}{[payload.contextImageUrl, payload.imageUrl, payload.continuationImageUrl].filter(Boolean).map((url, index) => <img key={index} src={publicMedia(url) || undefined} className="max-h-96 max-w-full rounded-lg object-contain" alt={`Hình minh họa câu ${question.id}, phần ${index + 1}`} />)}{payload.audioUrl && <audio className="w-full" controls preload="none" src={publicMedia(payload.audioUrl) || undefined} aria-label="Âm thanh câu hỏi" />}</div>;
}
