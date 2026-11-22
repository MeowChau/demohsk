import type { PronunciationAssessment } from "@/lib/api/types";
import type { HandwritingStrokeProgress } from "@/lib/writing-practice";
import { errorDistribution, pronunciationFeedback, writingFeedback, PRACTICE_FEEDBACK_THRESHOLD, type WritingFeedbackTarget } from "@/lib/practice-feedback";

const limit = 5;
const scoreText = (score: number | null) => score === null ? "Chưa chấm" : score.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + "/100";
const tableClass = "w-full table-fixed text-left text-sm text-ink";
const headClass = "bg-paper text-xs font-medium text-slate";
const cellClass = "px-3 py-3 align-top sm:px-4";

const sliceColors = ["var(--teal)", "var(--violet)", "var(--danger)", "var(--xp)", "var(--gems-deep)", "var(--slate-soft)"];

function ErrorPieChart({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const { total, slices } = errorDistribution(rows);
  if (!total) return null;
  return <figure aria-label={title} className="mt-4 rounded-lg bg-paper p-4">
    <figcaption className="text-sm font-semibold text-ink">{title}</figcaption>
    <div className="mt-3 grid items-center gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
      <svg viewBox="0 0 200 200" className="mx-auto h-auto w-full max-w-48" role="img" aria-label={`${title}: ${total} lượt. ${slices.map(slice => `${slice.label}: ${slice.value} lượt`).join(", ")}`}>
        <circle cx="100" cy="100" r="70" fill="none" stroke="var(--mist)" strokeWidth="28" />
        {slices.map((slice, index) => <circle key={index} cx="100" cy="100" r="70" pathLength="100" fill="none"
          stroke={sliceColors[index]} strokeWidth="28" strokeDasharray={`${slice.percent} ${100 - slice.percent}`}
          strokeDashoffset={-slice.offset} transform="rotate(-90 100 100)">
          <title>{`${slice.label}: ${slice.value} lượt (${slice.percent.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%)`}</title>
        </circle>)}
        <text x="100" y="99" textAnchor="middle" fill="var(--ink)" fontSize="28" fontWeight="600">{total}</text>
        <text x="100" y="120" textAnchor="middle" fill="var(--slate)" fontSize="12">lượt cần cải thiện</text>
      </svg>
      <ul className="min-w-0 space-y-3">{slices.map((slice, index) => <li key={index} className="flex min-w-0 items-start gap-2 text-sm">
        <span aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: sliceColors[index] }} />
        <span className="min-w-0 flex-1 break-words text-ink">{slice.label}</span>
        <span className="shrink-0 text-right text-xs leading-6 tabular-nums text-slate">{slice.value} lượt · {slice.percent.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%</span>
      </li>)}</ul>
    </div>
    <p className="mt-2 text-xs leading-5 text-slate">Tỷ lệ là phần của từng nhóm trong tổng số lượt cần cải thiện, không phải tỷ lệ trả lời sai của toàn bài.</p>
  </figure>;
}

export function WritingErrorTable({ targets, progress }: { targets: WritingFeedbackTarget[]; progress: Record<string, HandwritingStrokeProgress | undefined> }) {
  const stats = writingFeedback(targets, progress);
  return <section aria-label="Thống kê lỗi nét viết" className="mt-4 border-t border-mist pt-4">
    <h4 className="text-sm font-semibold text-ink">Từ sai nét nhiều nhất</h4>
    <p className="mt-1 text-xs leading-5 text-slate">Tối đa {limit} từ cần ưu tiên luyện lại, xếp theo lượt sai nét trong bài làm này. Các từ giống nhau được gộp lại.</p>
    <ErrorPieChart title="Phân bố lượt sai nét theo từ" rows={stats.rows.map(row => ({ label: row.text, value: row.mistakes }))} />
    {stats.rows.length ? <div className="mt-3 overflow-hidden rounded-lg border border-mist">
      <table className={tableClass}><caption className="sr-only">Từ cần cải thiện nét viết, số lượt sai và số nét đúng đã ghi nhận</caption>
        <thead className={headClass}><tr><th scope="col" className={cellClass}>Từ</th><th scope="col" className={cellClass + " text-right"}>Lượt sai nét</th><th scope="col" className={cellClass + " text-right"}>Nét đúng</th></tr></thead>
        <tbody className="divide-y divide-mist">{stats.rows.slice(0, limit).map(row => <tr key={row.text}>
          <th scope="row" className={cellClass + " font-normal"}><span lang="zh-CN" className="break-words text-base font-medium">{row.text}</span>{row.pinyin && <span className="mt-1 block break-words text-xs text-slate">{row.pinyin}</span>}</th>
          <td className={cellClass + " text-right font-semibold tabular-nums text-danger"}>{row.mistakes}</td>
          <td className={cellClass + " text-right tabular-nums"}>{row.correctStrokes}/{row.totalStrokes}</td>
        </tr>)}</tbody>
      </table>
    </div> : <p className="mt-3 rounded-lg bg-paper p-3 text-sm leading-6 text-slate" role="status">{stats.attemptedCount
      ? "Chưa ghi nhận lỗi nét ở các từ đã luyện trong lượt này."
      : "Chưa có dữ liệu nét viết. Luyện viết trong ô chữ rồi nộp bài để xem từ cần cải thiện."}</p>}
  </section>;
}

export function SpeakingErrorTable({ assessments }: { assessments: Record<string, PronunciationAssessment> }) {
  const stats = pronunciationFeedback(assessments);
  const hasAssessment = Object.keys(assessments).length > 0;
  return <section aria-label="Thống kê lỗi phát âm" className="mt-4 border-t border-mist pt-4">
    <h4 className="text-sm font-semibold text-ink">Từ và âm cần luyện nhiều nhất</h4>
    <p className="mt-1 text-xs leading-5 text-slate">Tối đa {limit} mục mỗi bảng, xếp theo số lượt cần cải thiện trong các câu đã chấm của bài này.</p>
    <ErrorPieChart title="Phân bố lượt cần cải thiện theo từ" rows={stats.words.map(row => ({ label: row.text, value: row.errors }))} />
    {stats.words.length ? <div className="mt-3 overflow-hidden rounded-lg border border-mist">
      <table className={tableClass}><caption className="sr-only">Các từ cần luyện phát âm, số lượt gặp lỗi và điểm phát âm trung bình</caption>
        <thead className={headClass}><tr><th scope="col" className={cellClass}>Từ</th><th scope="col" className={cellClass}>Cần cải thiện</th><th scope="col" className={cellClass + " text-right"}>Điểm TB</th></tr></thead>
        <tbody className="divide-y divide-mist">{stats.words.slice(0, limit).map(row => <tr key={row.text}>
          <th scope="row" lang="zh-CN" className={cellClass + " break-words font-medium"}>{row.text}</th>
          <td className={cellClass + " text-xs leading-5"}>
            {row.mispronounced > 0 && <span className="block text-danger">Phát âm: {row.mispronounced} lượt</span>}
            {row.omitted > 0 && <span className="block text-slate">Bỏ sót: {row.omitted} lượt</span>}
            {row.inserted > 0 && <span className="block text-slate">Đọc thừa: {row.inserted} lượt</span>}
          </td>
          <td className={cellClass + " text-right tabular-nums"}>{scoreText(row.accuracy)}</td>
        </tr>)}</tbody>
      </table>
    </div> : <p className="mt-3 rounded-lg bg-paper p-3 text-sm leading-6 text-slate" role="status">{stats.assessedWordCount
      ? "Chưa ghi nhận từ phát âm sai hoặc đọc thiếu trong các câu đã chấm."
      : hasAssessment ? "Kết quả chấm chưa có chi tiết từng từ để thống kê lỗi."
        : "Chưa có kết quả chấm phát âm. Ghi âm và chấm thành công để xem từ, âm cần luyện lại."}</p>}
    <ErrorPieChart title="Phân bố lượt cần cải thiện theo âm" rows={stats.phonemes.map(row => ({ label: row.text, value: row.errors }))} />
    {stats.phonemes.length > 0 && <div className="mt-4 overflow-hidden rounded-lg border border-mist">
      <table className={tableClass}><caption className="bg-paper px-3 py-2 text-left text-xs font-semibold text-ink sm:px-4">Âm cần cải thiện · điểm dưới {PRACTICE_FEEDBACK_THRESHOLD}/100</caption>
        <thead className={headClass}><tr><th scope="col" className={cellClass}>Âm / trong từ</th><th scope="col" className={cellClass + " text-right"}>Lượt cần luyện</th><th scope="col" className={cellClass + " text-right"}>Điểm TB</th></tr></thead>
        <tbody className="divide-y divide-mist">{stats.phonemes.slice(0, limit).map(row => <tr key={row.text}>
          <th scope="row" className={cellClass + " font-normal"}><span className="break-words font-semibold">{row.text}</span><span lang="zh-CN" className="mt-1 block break-words text-xs text-slate">{row.words.join(" · ")}</span></th>
          <td className={cellClass + " text-right font-semibold tabular-nums text-danger"}>{row.errors}</td>
          <td className={cellClass + " text-right tabular-nums"}>{scoreText(row.accuracy)}</td>
        </tr>)}</tbody>
      </table>
    </div>}
    {hasAssessment && <p className="mt-3 text-xs leading-5 text-slate">{stats.assessedPhonemeCount
      ? stats.phonemes.length ? "Điểm TB tính trên các lần âm xuất hiện và được chấm. Lượt cần luyện đếm các lần âm dưới 60/100; từ bỏ sót được thống kê riêng."
        : "Chưa ghi nhận âm dưới 60/100 trong phần đã được chấm chi tiết."
      : "Lượt chấm này chưa có chi tiết từng âm; bảng phía trên chỉ thống kê theo từ."}</p>}
  </section>;
}
