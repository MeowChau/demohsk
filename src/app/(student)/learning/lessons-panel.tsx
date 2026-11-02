import { learningViews } from "@/lib/api/learning";

import { CourseBatchRepository } from "@/lib/repositories/course-batch.repository";
import { VideoTypeIcon, PdfTypeIcon, YoutubeTypeIcon, NotesTypeIcon, BookIcon, UrgencyIcon } from "@/components/icons/stat-icons";
import { EnrollButton, DropCourseButton } from "./enrollment-controls";
import type { ContentType, CourseBatch } from "@/types/courses";

const CONTENT_ICON: Record<ContentType, typeof VideoTypeIcon> = {
  Video: VideoTypeIcon,
  PDF: PdfTypeIcon,
  YouTube: YoutubeTypeIcon,
  Notes: NotesTypeIcon,
};

export async function LessonsPanel({studentid}:{studentid:string}){
 const views=await learningViews();const browsable:import("@/types/courses").Course[]=[];
 const urgentMap=new Map<string,{batch:CourseBatch;enrolled:number}|null>();
 const urgencyLabel=(_batch:CourseBatch,_enrolled:number)=>"";
  return (
    <div className="flex flex-col gap-10">
      <section>
        {views.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-mist p-6">
            <BookIcon size={32} />
            <h2 className="font-display text-lg font-semibold text-navy dark:text-white">No courses yet</h2>
            <p className="text-sm text-slate">Enroll in a course below to see its lessons here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {views.map(({ enrollid, course, contents }) => (
              <div key={course.courseid} className="rounded-lg bg-surface p-6 shadow-card">
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="font-display text-lg font-semibold text-ink">{course.title}</h2>
                  <div className="flex items-center gap-2">
                    {course.level && (
                      <span className="rounded-pill bg-mist px-3 py-1 text-xs font-medium text-slate">{course.level}</span>
                    )}

                  </div>
                </div>
                {contents.length === 0 ? (
                  <p className="text-sm text-slate-soft">No lessons published yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {contents.map((content) => {
                      const Icon = CONTENT_ICON[content.content_type];
                      const href = content.youtube_link || content.file_url || null;
                      const rowClasses =
                        "flex items-center gap-3 rounded-md border border-mist px-4 py-3 text-sm text-ink transition-colors";

                      if (!href) {
                        return (
                          <li
                            key={content.contentid}
                            className={`${rowClasses} opacity-60`}
                            title="No link attached to this content yet"
                          >
                            <Icon size={18} className="shrink-0 text-teal" />
                            <span className="flex-1">{content.title}</span>
                            <span className="text-xs text-slate-soft">{content.content_type}</span>
                          </li>
                        );
                      }

                      return (
                        <li key={content.contentid}>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${rowClasses} hover:border-teal hover:bg-mist/40`}
                          >
                            <Icon size={18} className="shrink-0 text-teal" />
                            <span className="flex-1">{content.title}</span>
                            <span className="text-xs text-slate-soft">
                              {content.content_type === "YouTube" || content.content_type === "Video" ? "Watch" : "View"}
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {browsable.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">Browse courses</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {browsable.map((course) => {
              const urgent = urgentMap.get(course.courseid);
              return (
                <div key={course.courseid} className="flex flex-col gap-2 rounded-lg border border-mist bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">{course.title}</p>
                    {course.course_code && (
                      <span className="rounded-pill bg-mist px-2 py-0.5 text-[10px] font-semibold text-slate-soft">
                        {course.course_code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-soft">
                    {course.level ?? "—"} · {course.duration ?? "—"}
                  </p>
                  {course.description && <p className="text-xs text-slate line-clamp-2">{course.description}</p>}
                  {urgent && (
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-coral">
                      <UrgencyIcon size={13} /> {urgencyLabel(urgent.batch, urgent.enrolled)}
                    </p>
                  )}
                  <EnrollButton courseid={course.courseid} batchid={urgent?.batch.batchid ?? null} title={course.title} />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
