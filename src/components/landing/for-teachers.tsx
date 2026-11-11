"use client"

import { motion, useInView } from "framer-motion"
import {
  ArrowRight,
  Check,
  Users,
  BarChart3,
  FileCheck,
  Video,
  Calendar,
  X,
  FileText,
  Clock,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

const teacherFeatures = [
  {
    icon: Users,
    text: "Học theo chủ đề — chọn nội dung phù hợp với cấp độ HSK",
  },
  {
    icon: BarChart3,
    text: "Mục tiêu cá nhân — lưu cấp độ hiện tại và cấp độ mong muốn",
  },
  {
    icon: FileCheck,
    text: "Luyện kỹ năng — nghe, nói, đọc, viết tiếng Trung",
  },
  {
    icon: Video,
    text: "Ôn từ vựng — kết hợp chữ Hán, pinyin và nghĩa từ",
  },
  {
    icon: Calendar,
    text: "Duy trì thói quen — theo dõi hoạt động học từ tài khoản",
  },
]

function BeforeAfterDemo() {
  const [revealed, setRevealed] = useState(false)

  const ref = useRef(null)

  const isInView = useInView(ref, {
    once: true,
    margin: "-100px",
  })

  useEffect(() => {
    if (!isInView) return

    const timer = setTimeout(() => {
      setRevealed(true)
    }, 800)

    return () => clearTimeout(timer)
  }, [isInView])

  return (
    <div
      ref={ref}
      className="relative w-full aspect-[4/3] rounded-xl border-3 border-ink overflow-hidden shadow-hard bg-paper"
    >
      {/* ------------------------------------------------------------------ */}
      {/* BEFORE */}
      {/* ------------------------------------------------------------------ */}

      <div className="absolute inset-0 bg-gray-200 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3 opacity-50">
          <X className="h-4 w-4 text-danger" />

          <span className="text-xs font-black text-slate">
             Học rời rạc </span>
        </div>

        <div className="space-y-2 flex-1">
          <div className="h-8 bg-gray-300 rounded border-2 border-gray-400 flex items-center px-2">
            <FileText className="h-3 w-3 text-gray-500 mr-2" />

            <div className="h-2 w-20 bg-gray-400 rounded" />
          </div>

          <div className="h-8 bg-gray-300 rounded border-2 border-gray-400 flex items-center px-2">
            <Clock className="h-3 w-3 text-gray-500 mr-2" />

            <div className="h-2 w-16 bg-gray-400 rounded" />
          </div>

          <div className="h-8 bg-gray-300 rounded border-2 border-gray-400 flex items-center px-2">
            <FileText className="h-3 w-3 text-gray-500 mr-2" />

            <div className="h-2 w-24 bg-gray-400 rounded" />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="h-12 bg-gray-300 rounded border-2 border-gray-400" />
            <div className="h-12 bg-gray-300 rounded border-2 border-gray-400" />
            <div className="h-12 bg-gray-300 rounded border-2 border-gray-400" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* AFTER */}
      {/* ------------------------------------------------------------------ */}

      <motion.div
        className="absolute inset-0 bg-white p-4 flex flex-col"
        initial={{ x: "100%" }}
        animate={
          revealed
            ? {
                x: "0%",
              }
            : {}
        }
        transition={{
          duration: 0.8,
          ease: "easeInOut",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Check className="h-4 w-4 text-success" />

          <span className="text-xs font-black text-teal">
             Cùng TriceHSK </span>
        </div>

        <div className="grid grid-cols-2 gap-2 flex-1">
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.8,
            }}
            animate={
              revealed
                ? {
                    opacity: 1,
                    scale: 1,
                  }
                : {}
            }
            transition={{
              delay: 0.3,
            }}
            className="bg-teal/10 rounded-lg border-2 border-teal/30 p-2"
          >
            <Users className="h-4 w-4 text-teal mb-1" />

            <div className="h-1.5 w-8 bg-teal/30 rounded" />
            <div className="h-1.5 w-12 bg-teal/20 rounded mt-1" />
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              scale: 0.8,
            }}
            animate={
              revealed
                ? {
                    opacity: 1,
                    scale: 1,
                  }
                : {}
            }
            transition={{
              delay: 0.4,
            }}
            className="bg-navy/10 rounded-lg border-2 border-navy/30 p-2"
          >
            <BarChart3 className="h-4 w-4 text-navy mb-1" />

            <div className="h-1.5 w-8 bg-navy/30 rounded" />
            <div className="h-1.5 w-12 bg-navy/20 rounded mt-1" />
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              scale: 0.8,
            }}
            animate={
              revealed
                ? {
                    opacity: 1,
                    scale: 1,
                  }
                : {}
            }
            transition={{
              delay: 0.5,
            }}
            className="bg-xp/10 rounded-lg border-2 border-xp/30 p-2"
          >
            <FileCheck className="h-4 w-4 text-xp mb-1" />

            <div className="h-1.5 w-8 bg-xp/30 rounded" />
            <div className="h-1.5 w-12 bg-xp/20 rounded mt-1" />
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              scale: 0.8,
            }}
            animate={
              revealed
                ? {
                    opacity: 1,
                    scale: 1,
                  }
                : {}
            }
            transition={{
              delay: 0.6,
            }}
            className="bg-violet/10 rounded-lg border-2 border-violet/30 p-2"
          >
            <Video className="h-4 w-4 text-violet mb-1" />

            <div className="h-1.5 w-8 bg-violet/30 rounded" />
            <div className="h-1.5 w-12 bg-violet/20 rounded mt-1" />
          </motion.div>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* REVEAL HANDLE */}
      {/* ------------------------------------------------------------------ */}

      <motion.div
        className="absolute top-1/2 -translate-y-1/2 h-12 w-1 bg-teal z-10"
        initial={{
          left: "100%",
        }}
        animate={
          revealed
            ? {
                left: "0%",
              }
            : {}
        }
        transition={{
          duration: 0.8,
          ease: "easeInOut",
        }}
      >
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-8 w-8 bg-teal rounded-full border-3 border-ink shadow-hard flex items-center justify-center">
          <ArrowRight className="h-4 w-4 text-white" />
        </div>
      </motion.div>
    </div>
  )
}

export function ForTeachers() {
  return (
    <section
      id="roadmap"
      className="overflow-hidden py-20 md:py-28 bg-violet/10"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Cinematic teacher workflow demo */}
          <motion.div
            initial={{
              opacity: 0,
              x: -40,
            }}
            whileInView={{
              opacity: 1,
              x: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.6,
            }}
            className="relative"
          >
            <BeforeAfterDemo />
          </motion.div>

          {/* Copy */}
          <motion.div
            initial={{
              opacity: 0,
              x: 40,
            }}
            whileInView={{
              opacity: 1,
              x: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.6,
              delay: 0.1,
            }}
          >
            <span className="inline-block text-sm font-black tracking-widest text-violet uppercase mb-3">
               Lộ trình của bạn </span>

            <h2 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter text-ink mb-6 leading-[1.2]">
               Học tiếng Trung. <br />
               Có mục tiêu. </h2>

            <p className="text-lg text-slate leading-relaxed mb-8 font-medium">
               Từ những chữ Hán đầu tiên đến các bài luyện HSK: chọn mục tiêu, học theo chủ đề và duy trì việc ôn tập mỗi ngày. </p>

            <ul className="space-y-4 mb-8">
              {teacherFeatures.map((feature, i) => (
                <motion.li
                  key={feature.text}
                  initial={{
                    opacity: 0,
                    x: 20,
                  }}
                  whileInView={{
                    opacity: 1,
                    x: 0,
                  }}
                  viewport={{
                    once: true,
                  }}
                  transition={{
                    delay: 0.2 + i * 0.1,
                  }}
                  className="flex items-start gap-3 text-ink font-bold"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet/10 mt-0.5 border-2 border-violet/20">
                    <Check className="h-4 w-4 text-violet" />
                  </div>

                  <span className="text-sm md:text-base">
                    {feature.text}
                  </span>
                </motion.li>
              ))}
            </ul>

            <Link
              href="/profile"
              className="btn-brutalist bg-violet hover:bg-violet-deep"
            >
               Đặt mục tiêu HSK <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
