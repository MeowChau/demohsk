"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import Link from "next/link"
import { ArrowRight, Target, Trophy } from "lucide-react"

import { BandProgressChart } from "@/components/dashboard/band-progress-chart"
import { SkillProgress } from "@/components/dashboard/skill-progress"
import { XpGem } from "@/components/gamification/xp-gem"
import { AnimatedFlame } from "@/components/gamification/animated-flame"
import { LevelBadge } from "@/components/gamification/level-badge"
import { BookIcon } from "@/components/icons/stat-icons"
import type { LevelInfo } from "@/types/gamification"
import type { LearningScoreSummary } from "@/lib/learning-scores"
import { learningScoresChangedSince } from "@/lib/learning-scores";
import { apiFetch } from "@/lib/api/client"
import type { DashboardTopic, HskAnalytics } from "@/lib/api/types"
import type { CheckInResponse } from "@/lib/daily-checkin"
import { DailyCheckInCard } from "@/components/dashboard/daily-checkin-card"

type StudentData = {
  current_band: number | null
  target_band: number | null
}

type StreakData = {
  current_streak: number
  longest_streak: number
} | null

type DashboardClientProps = {
  topics: DashboardTopic[]
  topicCount?: number
  student: StudentData | null
  xpTotal: number
  streak: StreakData
  levelInfo: LevelInfo
  assessmentLoadedAt?: number
  initialAssessment: LearningScoreSummary | null
  analytics: HskAnalytics
}

function StatCard({
  icon,
  label,
  value,
  suffix,
  accent,
  bg,
  border,
  iconBg,
  textLight,
  highlight,
  delay = 0,
}: {
  icon: React.ReactNode
  label: string
  value: number
  suffix?: string
  accent: string
  bg: string
  border: string
  iconBg: string
  textLight?: boolean
  highlight?: boolean
  delay?: number
}) {
  const [displayValue, setDisplayValue] = useState(0)
  const ref = useRef<HTMLDivElement | null>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    let current = 0
    const step = value / 30

    const interval = setInterval(() => {
      current += step

      if (current >= value) {
        setDisplayValue(value)
        clearInterval(interval)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, 30)

    return () => clearInterval(interval)
  }, [isInView, value])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay,
        type: "spring",
        stiffness: 100,
      }}
      whileHover={{
        y: -5,
        scale: 1.02,
      }}
      className={`relative flex flex-col overflow-hidden rounded-2xl border-3 p-5 shadow-hard transition-all hover:shadow-brutalist ${bg} ${border} ${
        highlight ? "ring-2 ring-orange-300" : ""
      }`}
    >
      <div
        className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink/10 ${iconBg}`}
      >
        {icon}
      </div>

      <p className="dashboard-summary-label">
        {label}
      </p>

      <p
        className={`mt-2 font-display text-3xl font-black tracking-tight ${accent}`}
      >
        {displayValue.toLocaleString()}

        {suffix && (
          <span
            className={`ml-1 text-sm font-bold ${
              textLight ? "text-white/70" : "text-slate dark:text-navy"
            }`}
          >
            {suffix}
          </span>
        )}
      </p>
    </motion.div>
  )
}

export default function DashboardClient({
  topics,
  topicCount = topics.length,
  student,
  xpTotal,
  streak,
  levelInfo,
  initialAssessment,
  assessmentLoadedAt = 0,
  analytics,
}: DashboardClientProps) {
  const [checkInReward, setCheckInReward] = useState<CheckInResponse | null>(null)

  // Same null-safe fallback pattern rewards-client already uses for streak.
  const currentStreak = streak?.current_streak ?? 0
  const longestStreak = streak?.longest_streak ?? 0

  const [assessment, setAssessment] = useState(initialAssessment)
  const [assessmentError, setAssessmentError] = useState("")
  const selectedLevel = assessment?.currentHskLevel ?? student?.current_band ?? 1
  useEffect(() => {
    let active = true
    let inFlight = false
    let refreshAgain = false
    const fresh = initialAssessment && Date.now()-assessmentLoadedAt<30000 && !learningScoresChangedSince(assessmentLoadedAt)
    let lastRequest = fresh ? Date.now() : 0
    setAssessment(initialAssessment)
    const refresh = async (force = false) => {
      if (inFlight) { refreshAgain ||= force; return }
      if (!force && Date.now() - lastRequest < 30000) return
      inFlight = true
      lastRequest = Date.now()
      try {
        const data = await apiFetch<LearningScoreSummary>("learning-scores")
        if (active) { setAssessment(data); setAssessmentError("") }
      } catch (cause) {
        if (active) setAssessmentError(cause instanceof Error ? cause.message : "Chưa tải được điểm học tập.")
      } finally { inFlight = false; if (active && refreshAgain) {refreshAgain=false;void refresh(true)} }
    }
    const onScore = () => { void refresh(true) }
    const onFocus = () => { void refresh() }
    if (!fresh) void refresh(true)
    window.addEventListener("hsk-scores-updated", onScore)
    window.addEventListener("focus", onFocus)
    return () => { active = false; window.removeEventListener("hsk-scores-updated", onScore); window.removeEventListener("focus", onFocus) }
  }, [initialAssessment,assessmentLoadedAt,student?.current_band])

  return (
    <div className="flex flex-col gap-8">
      {/* 
          WELCOME HEADER
      */}

      <div
        className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="space-y-1">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-display text-3xl font-black tracking-tighter text-navy dark:text-white sm:text-5xl"
          >
             Chào mừng bạn trở lại! 👋 </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-base font-medium text-slate"
          >
            {topicCount > 0
              ? `Bạn có ${topicCount} chủ đề bài học HSK.`
              : "Các chủ đề HSK đã xuất bản sẽ xuất hiện ở đây."}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.3,
            type: "spring",
          }}
          className="flex items-center gap-3 rounded-2xl border-3 border-ink bg-white px-5 py-3 shadow-hard dark:border-slate/30 dark:bg-surface"
        >
          <LevelBadge
            level={levelInfo.level}
            title={levelInfo.title}
            size="sm"
          />

          <div className="hidden sm:block">
            <p className="text-xs font-black uppercase tracking-wider text-slate">
              {levelInfo.title}
            </p>

            <div className="mt-1 h-2.5 w-28 overflow-hidden rounded-full border border-mist bg-mist">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal to-cyan"
                initial={{ width: 0 }}
                animate={{
                  width: `${levelInfo.progressPercent}%`,
                }}
                transition={{
                  delay: 0.8,
                  duration: 1.5,
                  ease: "easeOut",
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* 
          STATS GRID
      */}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<XpGem size={24} />}
          label="Tổng EXP"
          value={Math.max(xpTotal, Number.isFinite(checkInReward?.totalExp) ? checkInReward!.totalExp : 0)}
          accent="text-ink dark:text-navy"
          bg="bg-gradient-to-br from-cyan to-cyan-light"
          border="border-teal/30"
          iconBg="bg-white/60"
          delay={0}
        />

        <StatCard
          icon={<AnimatedFlame size={24} />}
          label="Chuỗi ngày học"
          value={currentStreak}
          suffix="ngày"
          accent="text-ink dark:text-navy"
          bg="bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-950/60 dark:to-amber-950/40"
          border="border-orange-300 dark:border-orange-400/30"
          iconBg="bg-white/60"
          highlight={currentStreak > 0}
          delay={0.1}
        />

        {/* REAL DATABASE COURSE COUNT */}
        <StatCard
          icon={<BookIcon size={24} />}
          label="Chủ đề HSK"
          value={topicCount}
          accent="text-white"
          bg="bg-navy"
          border="border-navy-deep"
          iconBg="bg-inverse/10"
          textLight
          delay={0.2}
        />

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
            scale: 0.95,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            delay: 0.3,
            type: "spring",
          }}
          whileHover={{
            y: -5,
            scale: 1.02,
          }}
        >
          <Link
            href="/practice"
            className="group flex h-full flex-col rounded-2xl border-3 border-ink bg-gradient-to-br from-navy to-navy-deep p-5 text-white shadow-hard transition-all hover:shadow-brutalist dark:border-slate/30"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-inverse/10">
              <Target size={20} className="text-cyan" />
            </div>

            <p className="dashboard-summary-label">Luyện tập mỗi ngày</p>

            <p className="mt-2 text-sm font-medium leading-6 text-white/80">
               Chọn kỹ năng và dành thời gian ôn tập hôm nay. </p>

            <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-cyan transition-all group-hover:gap-2">
               Luyện tập ngay <ArrowRight size={14} />
            </div>
          </Link>
        </motion.div>
      </div>

      <DailyCheckInCard initialAnalytics={analytics} onConfirmed={setCheckInReward} />

      {/* STREAK BANNER */}

      {currentStreak > 0 && (
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.4,
          }}
          className="relative flex items-center gap-4 overflow-hidden rounded-2xl border-3 border-orange-300 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 p-5 dark:from-orange-950/60 dark:via-amber-950/40 dark:to-surface dark:border-orange-400/30 shadow-hard"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-orange-200 bg-orange-100 dark:border-orange-400/30 dark:bg-orange-950/50">
            <AnimatedFlame size={28} />
          </div>

          <div>
            <p className="text-base font-black text-navy">
              {currentStreak === 1
                ? "Bạn vừa bắt đầu chuỗi ngày học! 🔥"
                : currentStreak < 3
                  ? `${currentStreak} ngày học liên tục. Tiếp tục nhé! 🔥`
                  : `${currentStreak} ngày học liên tục. Bạn làm tốt lắm! 🔥🔥`}
            </p>

            <p className="mt-0.5 text-sm font-medium text-slate dark:text-navy">
               Chuỗi dài nhất: {" "}
              {longestStreak}  ngày. Tiếp tục duy trì nhé! </p>
          </div>

          <motion.div
            animate={{
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            className="absolute right-4 top-1/2 hidden -translate-y-1/2 md:block"
          >
            <Trophy className="h-8 w-8 text-orange-300" />
          </motion.div>
        </motion.div>
      )}

      {/* 
          BAND PROGRESS + SKILLS
      */}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        {/* REAL DATABASE BAND DATA */}

        <motion.section
          initial={{
            opacity: 0,
            x: -20,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            delay: 0.5,
          }}
          className="relative overflow-hidden rounded-2xl border-3 border-ink bg-white p-6 shadow-hard dark:border-slate/30 dark:bg-surface"
        >
          <div className="absolute left-0 right-0 top-0 h-1.5 bg-gradient-to-r from-teal to-cyan" />

          <h2 className="mb-5 font-display text-lg font-black tracking-tight text-navy dark:text-white">
             Mục tiêu học HSK </h2>

          <BandProgressChart
            unit="HSK"
            currentBand={assessment?.currentHskLevel ?? student?.current_band ?? null}
            targetBand={student?.target_band ?? null}
          />
          <p className="mt-5 text-center text-xs leading-6 text-slate">Đạt đề HSK của cấp cao hơn để cập nhật mức hiện tại trong hồ sơ. Làm lại đề cùng cấp không tự tăng sang cấp tiếp theo.</p>
        </motion.section>

        {/* Điểm tổng hợp theo cấp; kỹ năng chưa được chấm giữ trạng thái riêng. */}

        <motion.section
          initial={{
            opacity: 0,
            x: 20,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            delay: 0.6,
          }}
          className="relative overflow-hidden rounded-2xl border-3 border-ink bg-white p-6 shadow-hard dark:border-slate/30 dark:bg-surface"
        >
          <div className="absolute left-0 right-0 top-0 h-1.5 bg-gradient-to-r from-navy to-teal" />

          <h2 className="mb-5 font-display text-lg font-black tracking-tight text-navy dark:text-white">
             Các kỹ năng tiếng Trung </h2>

          {assessmentError && <p className="mb-4 text-xs leading-5 text-slate" role="status">{assessmentError} · Điểm sẽ xuất hiện khi backend hỗ trợ chức năng này.</p>}
          <SkillProgress
            summary={assessment} selectedLevel={selectedLevel}
          />
        </motion.section>
      </div>

      {/* 
          YOUR COURSES
          REAL DATABASE DATA
      */}

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-black tracking-tight text-navy dark:text-white">
             Chủ đề của bạn </h2>

          <Link
            href="/learning"
            className="text-sm font-black text-teal transition-colors hover:text-teal-deep"
          >
             Xem tất cả bài học → </Link>
        </div>

        {topics.length === 0 ? (
          <div className="rounded-2xl border-3 border-dashed border-mist bg-paper p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-mist">
              <BookIcon
                size={24}
                className="text-slate"
              />
            </div>

            <p className="text-sm font-black text-slate">
               Chưa có chủ đề HSK. </p>

            <p className="mt-1 text-xs font-medium text-slate-soft">
               Nội dung sẽ xuất hiện khi có chủ đề phù hợp với cấp độ của bạn. </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {topics.map(topic => (
              <Link
                key={topic.topicKey}
                href="/learning"
                className="group relative overflow-hidden rounded-2xl border-3 border-ink bg-white p-5 shadow-hard transition-all hover:-translate-y-0.5 hover:border-teal/30 hover:shadow-brutalist dark:border-slate/30 dark:bg-surface"
              >
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-teal to-cyan opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-black text-ink dark:text-white">
                      {topic.titleVi || topic.titleCn || topic.topicKey}
                    </p>

                    <p className="mt-1 text-sm text-slate">
                      {topic.totalSets} bài học

                      {` · HSK ${topic.hskLevel}`}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mist transition-colors group-hover:bg-teal/10">
                    <ArrowRight
                      size={18}
                      className="text-slate transition-colors group-hover:text-teal"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
