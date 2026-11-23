"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SKILL_LABELS } from "@/lib/hsk";
import { ListeningIcon, ReadingIcon, WritingIcon, SpeakingIcon } from "@/components/icons/stat-icons";
import type { Skill } from "@/types/assessment";
import type { LearningScoreSummary } from "@/lib/learning-scores";

const SKILL_META: Record<Skill, { icon: typeof ListeningIcon; color: string; gradient: string }> = {
  Listening: { icon: ListeningIcon, color: "var(--teal-text)", gradient: "from-teal to-cyan" },
  Reading: { icon: ReadingIcon, color: "var(--brand-text)", gradient: "from-navy to-blue-400" },
  Writing: { icon: WritingIcon, color: "var(--xp-text)", gradient: "from-xp to-amber-400" },
  Speaking: { icon: SpeakingIcon, color: "var(--violet-text)", gradient: "from-violet to-purple-400" },
};

export function SkillProgress({ summary, selectedLevel = 1 }: { summary: LearningScoreSummary | null; selectedLevel?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  return <div ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {(Object.keys(SKILL_META) as Skill[]).map((skill, index) => {
      const { icon: Icon, color, gradient } = SKILL_META[skill];
      const score = summary?.skills[skill]?.score ?? null;
      const hasScore = score !== null && Number.isFinite(score);
      const tracing = skill === "Writing" && !hasScore && (summary?.writingProgress?.total || 0) > 0 ? summary!.writingProgress : null;
      const pct = Math.min(100, Math.max(0, hasScore ? score : tracing ? tracing.completed / tracing.total * 100 : 0));
      const shownScore = hasScore ? score.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) : "";

      return <motion.div key={skill} data-skill={skill} role="group" aria-label={SKILL_LABELS[skill] + " · HSK " + (summary?.hskLevel || selectedLevel)}
        initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ delay: index * 0.15, type: "spring", stiffness: 100 }} whileHover={{ y: -3, scale: 1.02 }}
        className="group relative min-w-0 overflow-hidden rounded-2xl border-3 border-ink bg-white p-5 shadow-hard transition-all hover:shadow-brutalist dark:border-slate/30 dark:bg-surface">
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink/10" style={{ backgroundColor: `color-mix(in srgb, ${color} 9%, transparent)` }}>
              <Icon size={20} style={{ color }} />
            </span>
            <h3 className="min-w-0 text-sm font-black leading-tight text-ink">{SKILL_LABELS[skill]}</h3>
          </div>
          {hasScore ? <p className="shrink-0 whitespace-nowrap text-right tabular-nums" style={{ color }}>
            <span className="text-2xl font-black tracking-tight">{shownScore}</span><span className="ml-1 text-xs font-semibold text-slate">/100</span>
          </p> : tracing ? <p className="shrink-0 text-right font-bold tabular-nums" style={{ color }}>{tracing.completed}/{tracing.total}<span className="ml-1 text-xs font-normal text-slate">chữ</span></p> : null}
        </div>

        {hasScore || tracing ? <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-slate">{hasScore ? "Điểm trung bình" : "Đã hoàn thành"}</p>
          <div role="progressbar" aria-label={SKILL_LABELS[skill] + (hasScore ? " · Điểm trung bình" : " · Tiến độ luyện viết")}
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
            aria-valuetext={hasScore ? `${shownScore} trên 100 điểm` : `${tracing!.completed} trên ${tracing!.total} chữ đã hoàn thành`}
            className="relative h-2.5 w-full overflow-hidden rounded-full border border-mist bg-mist">
            <motion.div className={`h-full rounded-full bg-gradient-to-r ${gradient}`} initial={{ width: 0 }}
              animate={isInView ? { width: `${pct}%` } : {}} transition={{ delay: 0.3 + index * 0.2, duration: 1.2, ease: "easeOut" }} />
          </div>
          <div className="relative h-6 w-full" aria-hidden="true">
            {[0, 30, 60, 100].map(milestone => <div key={milestone} style={{ left: `${milestone}%` }}
              className={"absolute top-0 flex flex-col " + (milestone === 0 ? "items-start" : milestone === 100 ? "-translate-x-full items-end" : "-translate-x-1/2 items-center")}>
              <span className="h-1 w-px bg-mist" />
              <span className="mt-0.5 text-[10px] font-semibold text-slate">{milestone}{tracing ? "%" : ""}</span>
            </div>)}
          </div>
        </div> : <p className="mt-4 text-sm font-medium text-slate">Chưa đánh giá</p>}
      </motion.div>;
    })}
  </div>;
}
