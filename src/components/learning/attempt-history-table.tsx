import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HskBadge } from "@/components/ui/catalog";
import { historyDate, historyDuration, historyMetric, historyResultHref, type AttemptHistorySummary } from "@/lib/learning-history";
import { SKILL_LABELS } from "@/lib/hsk";

export function AttemptHistoryTable({ items }: { items: AttemptHistorySummary[] }) {
  return <div className="hsk-panel relative min-w-0 max-w-full overflow-x-auto p-0"><table className="w-full text-left text-sm">
    <caption className="sr-only">Các lượt bài làm đã nộp của bạn</caption>
    <thead className="border-b border-mist bg-paper text-slate"><tr>{["Ngày nộp", "Bài làm", "Cấp độ", "Kết quả", "Thời gian", ""].map((label, index) => <th key={index} scope="col" aria-label={label ? undefined : "Xem chi tiết"} className={`whitespace-nowrap px-5 py-4 font-medium ${index === 2 ? "w-28 text-center" : ""}`}>{label}</th>)}</tr></thead>
    <tbody>{items.map(item => <tr key={item.id} className="border-b border-mist last:border-0">
      <td className="whitespace-nowrap px-5 py-4 text-slate"><time dateTime={item.submittedAt}>{historyDate(item.submittedAt)}</time></td>
      <td className="min-w-48 px-5 py-4"><Link href={historyResultHref(item.id)} className="font-semibold text-ink hover:text-brand">{item.title}</Link><p className="mt-1 text-xs text-slate">{item.kind === "exam" ? "Đề thi" : "Bài luyện"} · {item.skills.map(skill => SKILL_LABELS[skill] || skill).join(", ")}</p></td>
      <td className="w-28 min-w-28 whitespace-nowrap px-5 py-4 text-center align-middle"><HskBadge level={item.hskLevel} /></td>
      <td className="min-w-52 px-5 py-4"><p className="font-semibold text-brand">{historyMetric(item)}</p>
        {item.kind === "exam" && item.totalScore !== null && <p className="mt-1 text-xs text-slate">Điểm HSK: {Number(item.totalScore.toFixed(1))}/{item.maxScore} · {item.passed ? "Đạt ngưỡng" : "Chưa đạt ngưỡng"}</p>}
        {item.kind === "exam" && !item.eligible && <p className="mt-1 text-xs text-slate">Chưa đủ điều kiện tính điểm HSK</p>}
        {(item.gradingStatus !== "graded" || item.ungradedCount > 0) && <p className="mt-1 text-xs text-slate">{item.gradingStatus === "partial" ? "Đã chấm một phần" : item.gradedCount === 0 ? "Kết quả tự luyện" : "Có mục chưa chấm tự động"}</p>}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-slate">{historyDuration(item.durationSeconds)}</td>
      <td className="px-5 py-4"><Link href={historyResultHref(item.id)} className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-brand">Xem lại</Link></td>
    </tr>)}</tbody>
  </table></div>;
}
