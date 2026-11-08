"use client"

import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from "framer-motion"
import {
  ArrowRight,
  Play,
  TrendingUp,
  Target,
  Zap,
  BookOpen,
  Headphones,
  PenLine,
  Mic,
} from "lucide-react"
import Link from "next/link"
import { useRef, useState, useEffect, useCallback } from "react"
import confetti from "canvas-confetti"
import type { HskTopic } from "@/lib/api/types"

type CatalogSummary = { words: number | null; practices: number | null; exams: number | null; topics: HskTopic[]; available: boolean }

// Animated Dashboard Mockup
function LiveDashboardMockup({ catalog }: { catalog: CatalogSummary }) {
  const [bandScore, setBandScore] = useState(0)
  const targetBand = 9
  const availableLevels = new Set(catalog.topics.filter(topic => topic.totalSets > 0).map(topic => topic.hskLevel)).size
  const skillCounts = ["listeningCount", "readingCount", "writingCount", "speakingCount"].map(key => catalog.topics.reduce((sum, topic) => sum + Number(topic[key as keyof HskTopic] || 0), 0))
  const maxSkillCount = Math.max(1, ...skillCounts)
  const number = (value: number | null) => value === null ? "—" : value.toLocaleString("vi-VN")

  useEffect(() => {
    const timer = setTimeout(() => {
      let current = 0

      const interval = setInterval(() => {
        current += 1

        if (current >= availableLevels) {
          setBandScore(availableLevels)
          clearInterval(interval)
        } else {
          setBandScore(current)
        }
      }, 50)

      return () => clearInterval(interval)
    }, 800)

    return () => clearTimeout(timer)
  }, [availableLevels])

  const progress = (bandScore / targetBand) * 100
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset =
    circumference - (progress / 100) * circumference

  return (
    <div className="relative w-full aspect-[4/3] bg-white rounded-xl border-3 border-ink overflow-hidden shadow-brutalist">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b-2 border-mist bg-paper">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400" />

        <div className="ml-3 flex-1 text-center">
          <div className="inline-block px-2 py-0.5 rounded bg-white border border-mist text-[10px] text-slate font-medium">
             TriceHSK · Nội dung từ hệ thống </div>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="p-4 space-y-3">
        {/* Welcome header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-3 w-24 bg-mist rounded animate-pulse" />
            <div className="h-2 w-32 bg-mist rounded mt-1.5" />
          </div>

          <div className="flex items-center gap-2">
            <div className="animate-gem-sparkle">
              <Zap className="h-4 w-4 text-xp" />
            </div>
            <span className="text-xs font-bold text-xp">
              {number(catalog.practices)}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              icon: Zap,
              color: "text-xp",
              label: "Từ vựng",
              value: number(catalog.words),
            },
            {
              icon: Target,
              color: "text-flame",
              label: "Bộ luyện tập",
              value: number(catalog.practices),
            },
            {
              icon: BookOpen,
              color: "text-teal",
              label: "Đề thi",
              value: number(catalog.exams),
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.3 + i * 0.15,
                duration: 0.5,
              }}
              className="rounded-lg border-2 border-mist bg-paper p-2"
            >
              <stat.icon className={`h-3 w-3 ${stat.color}`} />

              <div className="text-[10px] font-bold text-ink mt-1">
                {stat.value}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Band progress + skills */}
        <div className="grid grid-cols-2 gap-2">
          {/* Band progress */}
          <div className="rounded-lg border-2 border-mist bg-paper p-3 flex flex-col items-center">
            <div className="relative h-20 w-20">
              <svg
                className="h-full w-full -rotate-90"
                viewBox="0 0 120 120"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="var(--mist)"
                  strokeWidth="8"
                />

                <motion.circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="var(--teal)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{
                    strokeDashoffset: circumference,
                  }}
                  animate={{
                    strokeDashoffset,
                  }}
                  transition={{
                    duration: 2,
                    ease: "easeOut",
                    delay: 0.5,
                  }}
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-navy">
                  {catalog.available ? `${bandScore}/${targetBand}` : "—"}
                </span>

                <span className="text-[8px] text-slate">
                  Cấp độ có bài
                </span>
              </div>
            </div>

            <span className="text-[9px] font-bold text-teal mt-1">
              {catalog.available ? `${availableLevels} cấp độ HSK` : "Đang cập nhật dữ liệu"}
            </span>
          </div>

          {/* Skills */}
          <div className="rounded-lg border-2 border-mist bg-paper p-2 space-y-1.5">
            {[
              {
                icon: Headphones,
                color: "#0EA599",
                pct: (skillCounts[0] || 0) / maxSkillCount * 100,
              },
              {
                icon: BookOpen,
                color: "#123C6B",
                pct: (skillCounts[1] || 0) / maxSkillCount * 100,
              },
              {
                icon: PenLine,
                color: "#F5A524",
                pct: (skillCounts[2] || 0) / maxSkillCount * 100,
              },
              {
                icon: Mic,
                color: "#9B8AFB",
                pct: (skillCounts[3] || 0) / maxSkillCount * 100,
              },
            ].map((skill, i) => (
              <motion.div
                key={i}
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{
                  delay: 0.8 + i * 0.1,
                  duration: 0.5,
                }}
                className="flex items-center gap-1.5"
              >
                <skill.icon
                  className="h-2.5 w-2.5 shrink-0"
                  style={{ color: skill.color }}
                />

                <div className="flex-1 h-1.5 bg-mist rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: skill.color,
                    }}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${skill.pct}%`,
                    }}
                    transition={{
                      delay: 1 + i * 0.15,
                      duration: 1,
                      ease: "easeOut",
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Floating particle background
function ParticleBackground() {
  const [particles, setParticles] = useState<
    Array<{
      id: number
      x: number
      y: number
      size: number
      delay: number
      duration: number
    }>
  >([])

  useEffect(() => {
    const generatedParticles = Array.from(
      { length: 20 },
      (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        delay: Math.random() * 5,
        duration: Math.random() * 10 + 10,
      })
    )

    setParticles(generatedParticles)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-navy/10 animate-particle-float"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

// Magnetic CTA button
function MagneticButton({
  children,
  href,
  variant = "primary",
}: {
  children: React.ReactNode
  href: string
  variant?: "primary" | "secondary"
}) {
  const ref = useRef<HTMLAnchorElement>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springX = useSpring(x, {
    stiffness: 150,
    damping: 15,
  })

  const springY = useSpring(y, {
    stiffness: 150,
    damping: 15,
  })

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return

      const rect = ref.current.getBoundingClientRect()

      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      x.set((e.clientX - centerX) * 0.15)
      y.set((e.clientY - centerY) * 0.15)
    },
    [x, y]
  )

  const handleMouseLeave = useCallback(() => {
    x.set(0)
    y.set(0)
  }, [x, y])

  const handleClick = useCallback(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: [
        "#78FFF9",
        "#0EA599",
        "#123C6B",
        "#F5A524",
        "#FF6B4A",
      ],
    })
  }, [])

  const baseClasses =
    variant === "primary"
      ? "btn-brutalist"
      : "btn-brutalist-outline"

  return (
    <motion.div style={{ x: springX, y: springY }}>
      <Link
        ref={ref}
        href={href}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={baseClasses}
      >
        {children}
      </Link>
    </motion.div>
  )
}

const HERO_HEADLINE_LINES = ["Cùng chinh phục", "tiếng Trung", "mỗi ngày."]
const HERO_HEADLINE = HERO_HEADLINE_LINES.join(" ")

// Reserve all three lines before typing so the illustration stays in place.
function TypewriterHeadline() {
  const [text, setText] = useState("")
  const [showCursor, setShowCursor] = useState(true)

  const fullText = HERO_HEADLINE

  useEffect(() => {
    let i = 0
    let cursorTimer: ReturnType<typeof setTimeout> | undefined

    const timer = setInterval(() => {
      if (i <= fullText.length) {
        setText(fullText.slice(0, i))
        i++
      } else {
        clearInterval(timer)

        cursorTimer = setTimeout(() => {
          setShowCursor(false)
        }, 1000)
      }
    }, 45)

    return () => {
      clearInterval(timer)
      if (cursorTimer) clearTimeout(cursorTimer)
    }
  }, [])

  return (
    <h1 className="hsk-hero-heading text-ink" aria-label={fullText}>
      {HERO_HEADLINE_LINES.map((line, index) => {
        const start = HERO_HEADLINE_LINES.slice(0, index).reduce((sum, item) => sum + item.length + 1, 0)
        const visible = text.slice(start, start + line.length)
        const cursorHere = showCursor && text.length >= start && text.length <= start + line.length
        return (
          <span key={line} className="hsk-hero-line" aria-hidden="true">
            {visible}
            {cursorHere && <span className="hsk-hero-cursor animate-blink text-teal">|</span>}
          </span>
        )
      })}
    </h1>
  )
}

export function Hero({ catalog }: { catalog: CatalogSummary }) {
  const sectionRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })

  const y1 = useTransform(
    scrollYProgress,
    [0, 1],
    [0, 150]
  )

  const y2 = useTransform(
    scrollYProgress,
    [0, 1],
    [0, -100]
  )

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.5],
    [1, 0]
  )

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-cyan pt-32 pb-16 md:pt-40 md:pb-24"
    >
      <ParticleBackground />

      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #0F1720 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <motion.div
        style={{ opacity }}
        className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{
              opacity: 0,
              x: -40,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.7,
              ease: "easeOut",
            }}
          >
            {/* Trust badge */}
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.9,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                delay: 0.2,
                duration: 0.5,
              }}
              className="inline-flex items-center rounded-full border-3 border-ink/10 bg-ink/5 px-4 py-1.5 text-sm font-black text-ink mb-6"
            >
              <span className="flex h-2.5 w-2.5 rounded-full bg-teal mr-2 animate-pulse" />
               你好 · Học tiếng Trung cùng TriceHSK </motion.div>

            {/* Headline */}
            <TypewriterHeadline />

            {/* Description */}
            <motion.p
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 1.5,
                duration: 0.6,
              }}
              className="mt-6 text-lg md:text-xl text-slate max-w-xl leading-relaxed font-medium"
            >
               Học chữ Hán, ghi nhớ pinyin và luyện nghe, nói, đọc, viết theo chủ đề HSK. Một nơi để bạn xây dựng nền tảng tiếng Trung và theo đuổi mục tiêu của mình. </motion.p>

            {/* CTAs */}
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
                delay: 1.8,
                duration: 0.6,
              }}
              className="mt-8 flex flex-wrap gap-4"
            >
              <MagneticButton
                href="/register"
                variant="primary"
              >
                 Đăng ký học HSK <ArrowRight className="h-4 w-4" />
              </MagneticButton>

              <MagneticButton
                href="/login"
                variant="secondary"
              >
                <Play className="h-4 w-4 fill-current" />
                 Khám phá cách học </MagneticButton>
            </motion.div>

            {/* Stats */}
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
                delay: 2.1,
                duration: 0.5,
              }}
              className="mt-10 flex items-center gap-6 md:gap-10"
            >
              {[
                {
                  value: "4",
                  label: "Kỹ năng",
                },
                {
                  value: "HSK",
                  label: "Nội dung",
                },
                {
                  value: "Cá nhân",
                  label: "Lộ trình",
                },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{
                    opacity: 0,
                    scale: 0.8,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  transition={{
                    delay: 2.3 + i * 0.15,
                    type: "spring",
                    stiffness: 200,
                  }}
                >
                  <div className="text-3xl md:text-4xl font-black text-ink">
                    {stat.value}
                  </div>

                  <div className="text-sm font-bold text-slate">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Live dashboard */}
          <motion.div
            initial={{
              opacity: 0,
              x: 40,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.7,
              delay: 0.4,
              ease: "easeOut",
            }}
            className="relative"
            style={{
              perspective: 1000,
            }}
          >
            <motion.div
              whileHover={{
                rotateY: 6,
                rotateX: -4,
                scale: 1.02,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              style={{
                transformStyle: "preserve-3d",
              }}
              className="relative"
            >
              <LiveDashboardMockup catalog={catalog} />
            </motion.div>

            {/* Floating streak card */}
            <motion.div
              style={{ y: y2 }}
              animate={{
                y: [0, -15, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 5,
                ease: "easeInOut",
              }}
              className="absolute -bottom-4 -left-4 md:-left-8 rounded-xl border-3 border-teal/30 bg-white p-4 shadow-hard z-10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-xp/10 text-xp animate-pulse-glow">
                  <Target className="h-6 w-6" />
                </div>

                <div>
                  <div className="text-base font-black text-navy">
                     Ôn tập mỗi ngày </div>

                  <div className="text-xs font-bold text-slate">
                     加油 · Cùng cố gắng! </div>
                </div>
              </div>
            </motion.div>

            {/* Floating score card */}
            <motion.div
              style={{ y: y1 }}
              animate={{
                y: [0, 12, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 4,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute -top-4 -right-4 md:-right-6 rounded-xl border-3 border-success/30 bg-white p-4 shadow-hard z-10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                  <TrendingUp className="h-6 w-6" />
                </div>

                <div>
                  <div className="text-base font-black text-navy">
                     Mục tiêu HSK </div>

                  <div className="text-xs font-bold text-slate">
                     学习中文 · Học tiếng Trung </div>
                </div>
              </div>
            </motion.div>

            {/* Floating XP gem */}
            <motion.div
              animate={{
                y: [0, -20, 0],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 6,
                ease: "easeInOut",
                delay: 2,
              }}
              className="absolute top-1/2 -right-8 md:-right-12 z-10"
            >
              <div className="animate-gem-sparkle">
                <Zap className="h-10 w-10 text-xp" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
