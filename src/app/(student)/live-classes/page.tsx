import type { LiveClass } from "@/types/courses";
import { CalendarIcon } from "@/components/icons/stat-icons";
import { EmptyState } from "@/components/ui/empty-state";

export default async function StudentLiveClassesPage(){const sorted:(LiveClass & {courseTitle:string})[]=[];const now=Date.now();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink dark:text-white"> Lớp học trực tuyến </h1>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon size={28} />}
          title="Chưa có lịch học trực tuyến"
          body="Lịch học sẽ xuất hiện khi được hệ thống hỗ trợ và xuất bản."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((c) => {
            const upcoming = new Date(c.class_date).getTime() >= now;
            return (
              <li key={c.classid} className="flex items-center gap-3 rounded-md border border-mist bg-surface px-4 py-3 text-sm">
                <CalendarIcon size={18} className={upcoming ? "shrink-0 text-teal" : "shrink-0 text-slate-soft"} />
                <div className="flex-1">
                  <p className="text-ink">{c.courseTitle}</p>
                  <p className="text-xs text-slate-soft">{new Date(c.class_date).toLocaleString()}</p>
                </div>
                {upcoming ? (
                  <span className="rounded-pill bg-teal/10 px-2.5 py-0.5 text-xs font-semibold text-teal"> Sắp diễn ra </span>
                ) : (
                  <span className="rounded-pill bg-mist px-2.5 py-0.5 text-xs font-medium text-slate-soft"> Đã diễn ra </span>
                )}
                {upcoming && (
                  <a href={c.meeting_link} className="font-medium text-teal" target="_blank" rel="noreferrer">
                     Tham gia </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
