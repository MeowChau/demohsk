"use client";
import { SKILL_LABELS } from "@/lib/hsk";


import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  ListeningIcon,
  ReadingIcon,
  WritingIcon,
  SpeakingIcon,
} from "@/components/icons/stat-icons";
import type { Skill } from "@/types/assessment";
import type { LearningScoreSummary } from "@/lib/learning-scores";

const MAX_SCORE = 100;

const SKILL_META: Record<
  Skill,
  {
    icon: typeof ListeningIcon;
    color: string;
    gradient: string;
  }
> = {
  Listening: {
    icon: ListeningIcon,
    color: "var(--teal-text)",
    gradient: "from-teal to-cyan",
  },
  Reading: {
    icon: ReadingIcon,
    color: "var(--brand-text)",
    gradient: "from-navy to-blue-400",
  },
  Writing: {
    icon: WritingIcon,
    color: "var(--xp-text)",
    gradient: "from-xp to-amber-400",
  },
  Speaking: {
    icon: SpeakingIcon,
    color: "var(--violet-text)",
    gradient: "from-violet to-purple-400",
  },
};

export function SkillProgress({
  summary,
  selectedLevel = 1,
}: {
  summary: LearningScoreSummary | null;
  selectedLevel?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const isInView = useInView(ref, {
    once: true,
    margin: "-50px",
  });

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 gap-4"
    >
      {(Object.keys(SKILL_META) as Skill[]).map(
        (skill, index) => {
          const {
            icon: Icon,
            color,
            gradient,
          } = SKILL_META[skill];

          const score = summary?.skills[skill]?.score ?? null;
          const hasScore = score !== null;
          const tracing = skill === "Writing" && !hasScore && (summary?.writingProgress.total || 0) > 0
            ? summary!.writingProgress : null;
          const pct = Math.min(100, Math.max(0, score ?? (tracing ? tracing.completed / tracing.total * 100 : 0)));

          return (
            <motion.div
              key={SKILL_LABELS[skill]}
              aria-label={SKILL_LABELS[skill] + " · HSK " + (summary?.hskLevel || selectedLevel)}
              initial={{
                opacity: 0,
                y: 20,
                scale: 0.95,
              }}
              animate={
                isInView
                  ? {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }
                  : {}
              }
              transition={{
                delay: index * 0.15,
                type: "spring",
                stiffness: 100,
              }}
              whileHover={{
                y: -3,
                scale: 1.02,
              }}
              className="group relative overflow-hidden rounded-2xl border-3 border-ink bg-white p-5 shadow-hard hover:shadow-brutalist transition-all dark:border-slate/30 dark:bg-surface"
            >
              {/* Skill accent */}
              <div
                className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${gradient}`}
              />

              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 border-2 border-ink/10"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${color} 9%, transparent)`,
                    }}
                  >
                    <Icon
                      size={20}
                      style={{ color }}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-black text-ink leading-tight dark:text-white">
                      {SKILL_LABELS[skill]}
                    </p>

                    <p className="text-xs text-slate mt-0.5 font-black">
                       Đánh giá </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className="text-2xl font-black tracking-tight tabular-nums"
                    style={{
                      color: hasScore || tracing
                        ? color
                        : "var(--slate)",
                    }}
                  >
                    {hasScore
                      ? score!.toFixed(1)
                      : tracing ? tracing.completed + "/" + tracing.total : "—"}
                  </span>

                  {hasScore && (
                    <span className="ml-1 text-xs font-black text-slate">
                      /{MAX_SCORE}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-slate">
                    {hasScore
                      ? "Điểm trung bình"
                      : tracing ? "Đã hoàn thành" : "Chưa đánh giá"}
                  </span>

                  <span className="font-black text-slate tabular-nums">
                    {hasScore
                      ? score!.toFixed(1)
                      : tracing ? Math.round(pct) + "%" : "0.0"}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-mist border border-mist relative">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
                    initial={{ width: 0 }}
                    animate={
                      isInView
                        ? {
                            width: `${pct}%`,
                          }
                        : {}
                    }
                    transition={{
                      delay:
                        0.3 + index * 0.2,
                      duration: 1.2,
                      ease: "easeOut",
                    }}
                  />

                  {hasScore && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        left: 0,
                      }}
                      animate={
                        isInView
                          ? {
                              opacity: [0, 1, 0],
                              left: `${pct}%`,
                            }
                          : {}
                      }
                      transition={{
                        delay:
                          1.2 + index * 0.2,
                        duration: 0.8,
                      }}
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-inverse shadow-[0_0_8px_currentColor]"
                      style={{ color }}
                    />
                  )}
                </div>

                {/* Các mốc trên thang điểm kỹ năng */}
                <div className="relative h-3 w-full">
                  {[30, 60, 100].map(
                    (milestone) => (
                      <div
                        key={milestone}
                        className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                        style={{
                          left: `${
                            (milestone /
                              MAX_SCORE) *
                            100
                          }%`,
                        }}
                      >
                        <div
                          className={`h-1 w-px transition-colors ${
                            hasScore &&
                            score! >= milestone
                              ? "bg-slate dark:bg-slate-soft"
                              : "bg-mist dark:bg-slate/20"
                          }`}
                        />

                        <span
                          className={`text-[10px] font-black mt-0.5 ${
                            hasScore &&
                            score! >= milestone
                              ? "text-slate dark:text-slate-soft"
                              : "text-slate-soft"
                          }`}
                        >
                          {milestone}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          );
        }
      )}
    </div>
  );
}
