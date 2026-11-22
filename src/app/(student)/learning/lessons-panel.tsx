import { learningViews } from "@/lib/api/learning";

import { VideoTypeIcon, PdfTypeIcon, YoutubeTypeIcon, NotesTypeIcon, BookIcon } from "@/components/icons/stat-icons";
import type { ContentType } from "@/types/courses";

const CONTENT_ICON: Record<ContentType, typeof VideoTypeIcon> = {
  Video: VideoTypeIcon,
  PDF: PdfTypeIcon,
  YouTube: YoutubeTypeIcon,
  Notes: NotesTypeIcon,
};

export async function LessonsPanel({studentid}:{studentid:string}){
 const views = await learningViews();
  return (
    <div className="flex flex-col gap-10">
      <section>
        {views.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-mist p-6">
            <BookIcon size={32} />
            <h2 className="font-display text-lg font-semibold text-ink dark:text-white">Chưa có chủ đề HSK</h2>
            <p className="text-sm text-slate">Các chủ đề sẽ xuất hiện khi có nội dung phù hợp với cấp độ HSK của bạn.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {views.map(({ enrollid, course, contents }) => (
              <div key={course.courseid} className="rounded-lg bg-surface p-6 shadow-card">
                <div className="mb-4 flex items-baseline justify-between">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-ink">{course.title}</h2>
                    {course.description && <p className="mt-1 text-sm leading-6 text-slate" lang="zh-CN">{course.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {course.level && (
                      <span className="rounded-pill bg-mist px-3 py-1 text-xs font-medium text-slate">{course.level}</span>
                    )}

                  </div>
                </div>
                {contents.length === 0 ? (
                  <p className="text-sm text-slate-soft">Chủ đề này chưa có bài luyện.</p>
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
                            title="Nội dung này chưa có liên kết"
                          >
                            <Icon size={18} className="shrink-0 text-teal" />
                            <span className="flex-1">{content.title}</span>
                            <span className="text-xs text-slate-soft">{content.content_type === "Notes" ? "Bài luyện" : content.content_type}</span>
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
                              {content.content_type === "YouTube" || content.content_type === "Video" ? "Xem bài" : "Mở bài"}
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

    </div>
  );
}
