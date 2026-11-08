import Link from "next/link";
import { requireApiUser } from "@/lib/api/server";
import { allPages } from "@/lib/api/learning";
import type { HskPractice } from "@/lib/api/types";
import { HSK_LEVELS } from "@/lib/hsk";
import { parseCatalogQuery, type SearchParams } from "@/lib/catalog-query";
import { AssessmentPanel } from "@/components/learning/assessment-panel";
import { PageHeading } from "@/components/ui/catalog";
export const metadata = { title: "Chấm bài viết và phát âm" };
export default async function AssessmentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireApiUser();
  const params = await searchParams;
  const level = Number(parseCatalogQuery(params, user.currentHskLevel || 1).hskLevel || 1);
  const mode = params.mode === "speaking" ? "speaking" : "writing";
  const sets = mode === "writing" ? await allPages<HskPractice>(`practice-sets?skill=WRITING&hskLevel=${level}`) : [];
  const questions = [...new Map(sets.flatMap(set => (set.practiceSetQuestions || []).flatMap(link => link.question ? [link.question] : [])).map(question => [question.id, question])).values()];
  return <div className="flex flex-col gap-6"><PageHeading title="Chấm bài tiếng Trung" description="Nhận phản hồi cho bài viết và bản ghi phát âm qua dịch vụ chấm của hệ thống." /><nav className="flex gap-2" aria-label="Loại bài chấm"><Link className={mode === "writing" ? "hsk-button" : "hsk-button-secondary"} href={`/assessment?mode=writing&hskLevel=${level}`}>Bài viết</Link><Link className={mode === "speaking" ? "hsk-button" : "hsk-button-secondary"} href={`/assessment?mode=speaking&hskLevel=${level}`}>Phát âm</Link></nav><form action="/assessment" className="flex items-end gap-3"><input type="hidden" name="mode" value={mode} /><label className="hsk-label">Cấp độ HSK<select name="hskLevel" className="hsk-input" defaultValue={level}>{HSK_LEVELS.map(value => <option key={value} value={value}>HSK {value}</option>)}</select></label><button className="hsk-button-secondary">Đổi cấp độ</button></form>{mode === "writing" && !questions.length && <p className="hsk-notice">Cấp độ này chưa có câu hỏi trong bộ luyện viết. Bạn có thể chọn cấp độ khác.</p>}<AssessmentPanel key={`${mode}-${level}`} mode={mode} level={level} questions={questions} /></div>;
}
