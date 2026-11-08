"use client"

import { motion, useInView } from "framer-motion"
import {
  Check,
  Headphones,
  BookOpen,
  PenLine,
  Mic,
  Download,
  Zap,
  Target,
  TrendingUp,
} from "lucide-react"
import { TiltCard } from "@/components/ui/tilt-card"
import { useRef, useState, useEffect } from "react"

// 1. Auto-graded test demo

function AutoGradedDemo() {
  const [scanning, setScanning] = useState(false)
  const [checked, setChecked] = useState<number[]>([])
  const [score, setScore] = useState(0)

  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, {
    once: true,
    margin: "-100px",
  })

  useEffect(() => {
    if (!isInView) return

    const timer = setTimeout(() => {
      setScanning(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [isInView])

  useEffect(() => {
    if (!scanning) return

    const timers = [0, 1, 2].map((index, i) =>
      setTimeout(() => {
        setChecked((prev) =>
          prev.includes(index) ? prev : [...prev, index]
        )
        setScore((prev) => prev + 1)
      }, 800 + i * 600)
    )

    return () => timers.forEach(clearTimeout)
  }, [scanning])

  const sections = [
    "AI 小语，你好！",
    "我叫李文",
    "我是中国人",
  ]

  return (
    <div
      ref={ref}
      className="relative w-full aspect-[4/3] bg-white rounded-xl border-3 border-ink overflow-hidden shadow-hard p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-red-400" />
        <div className="h-2 w-2 rounded-full bg-yellow-400" />
        <div className="h-2 w-2 rounded-full bg-green-400" />

        <div className="text-[10px] text-slate font-medium ml-2">
           Minh họa bài luyện nghe HSK </div>
      </div>

      <div className="space-y-2">
        {sections.map((section, i) => (
          <motion.div
            key={section}
            className="flex items-center gap-2 p-2 rounded-lg border-2 border-mist relative overflow-hidden"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2 + i * 0.15 }}
          >
            {scanning && !checked.includes(i) && (
              <motion.div
                className="absolute inset-0 bg-teal/10"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  duration: 0.8,
                  delay: 0.5 + i * 0.6,
                  ease: "easeInOut",
                }}
              />
            )}

            <div
              className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                checked.includes(i)
                  ? "bg-success border-success"
                  : "border-mist"
              }`}
            >
              {checked.includes(i) && (
                <Check className="h-3 w-3 text-white" />
              )}
            </div>

            <span className="text-xs font-bold text-ink">
              {section}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="absolute bottom-3 right-3 bg-navy text-white px-3 py-1.5 rounded-lg text-xs font-black"
        initial={{ scale: 0 }}
        animate={score > 0 ? { scale: 1 } : {}}
        transition={{ type: "spring", stiffness: 300 }}
      >
         Đã xem: {score}/3
      </motion.div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 2. Skill modules bento demo
// -----------------------------------------------------------------------------

function SkillModulesDemo() {
  const skills = [
    {
      icon: Headphones,
      color: "bg-teal",
      label: "Nghe hiểu",
      pct: 78,
    },
    {
      icon: BookOpen,
      color: "bg-navy",
      label: "Đọc hiểu",
      pct: 65,
    },
    {
      icon: PenLine,
      color: "bg-xp",
      label: "Viết tiếng Trung",
      pct: 52,
    },
    {
      icon: Mic,
      color: "bg-violet",
      label: "Luyện nói",
      pct: 45,
    },
  ]

  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, {
    once: true,
    margin: "-100px",
  })

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 gap-2 w-full aspect-[4/3]"
    >
      {skills.map((skill, i) => {
        const Icon = skill.icon

        return (
          <motion.div
            key={skill.label}
            initial={{
              opacity: 0,
              scale: 0.8,
              rotate: -5,
            }}
            animate={
              isInView
                ? {
                    opacity: 1,
                    scale: 1,
                    rotate: 0,
                  }
                : {}
            }
            transition={{
              delay: 0.2 + i * 0.15,
              type: "spring",
              stiffness: 200,
            }}
            whileHover={{
              scale: 1.05,
              rotate: 2,
              zIndex: 10,
            }}
            className={`${skill.color} rounded-xl border-3 border-ink p-3 flex flex-col items-center justify-center shadow-hard`}
          >
            <Icon className="h-6 w-6 text-white mb-1" />

            <span className="text-[10px] font-black text-white">
              {skill.label}
            </span>

            <motion.div
              className="mt-1 h-1.5 w-full bg-white/30 rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.6 + i * 0.1 }}
            >
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={
                  isInView
                    ? { width: `${skill.pct}%` }
                    : {}
                }
                transition={{
                  delay: 0.8 + i * 0.1,
                  duration: 1,
                  ease: "easeOut",
                }}
              />
            </motion.div>
          </motion.div>
        )
      })}
    </div>
  )
}

// -----------------------------------------------------------------------------
// 3. Vocabulary flashcards demo
// -----------------------------------------------------------------------------

function VocabDemo() {
  const [flipped, setFlipped] = useState(false)

  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, {
    once: true,
    margin: "-100px",
  })

  return (
    <div
      ref={ref}
      className="relative w-full aspect-[4/3] flex items-center justify-center"
    >
      <motion.div
        className="relative w-32 h-20 cursor-pointer"
        onClick={() => setFlipped((value) => !value)}
        initial={{ opacity: 0, y: 20 }}
        animate={
          isInView
            ? {
                opacity: 1,
                y: 0,
              }
            : {}
        }
        transition={{ delay: 0.3 }}
      >
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 bg-paper rounded-xl border-3 border-ink shadow-hard"
            initial={{
              rotate: 0,
              x: 0,
            }}
            animate={
              isInView
                ? {
                    rotate: (i - 2) * 8,
                    x: (i - 2) * 12,
                  }
                : {}
            }
            transition={{
              delay: 0.5 + i * 0.1,
              type: "spring",
              stiffness: 200,
            }}
          />
        ))}

        <motion.div
          className="absolute inset-0 bg-white rounded-xl border-3 border-ink shadow-brutalist flex items-center justify-center z-10"
          animate={{
            rotateY: flipped ? 180 : 0,
          }}
          transition={{ duration: 0.4 }}
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          <div
            className="text-center"
            style={{
              backfaceVisibility: "hidden",
            }}
          >
            <div className="text-xs font-black text-ink">
               学习 </div>

            <div className="text-[8px] text-slate mt-0.5">
               xuéxí · động từ </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-2 text-[10px] font-bold text-teal"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 1 }}
      >
         Bấm để lật thẻ ↻ </motion.div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 4. AI Tutor demo
// -----------------------------------------------------------------------------

function AiTutorDemo() {
  const [text, setText] = useState("")

  const fullText =
    "学习 (xuéxí) nghĩa là học tập. Ví dụ: 我每天学习中文。Wǒ měitiān xuéxí Zhōngwén. Tôi học tiếng Trung mỗi ngày."

  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, {
    once: true,
    margin: "-100px",
  })

  useEffect(() => {
    if (!isInView) return

    let i = 0

    const timer = setInterval(() => {
      if (i <= fullText.length) {
        setText(fullText.slice(0, i))
        i++
      } else {
        clearInterval(timer)
      }
    }, 30)

    return () => clearInterval(timer)
  }, [isInView])

  return (
    <div
      ref={ref}
      className="w-full aspect-[4/3] bg-white rounded-xl border-3 border-ink overflow-hidden shadow-hard p-3 flex flex-col"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="h-6 w-6 rounded-full bg-teal flex items-center justify-center">
          <Zap className="h-3 w-3 text-white" />
        </div>

        <span className="text-[10px] font-black text-ink">
           Góc học tiếng Trung </span>
      </div>

      <div className="flex-1 space-y-2">
        <div className="bg-mist rounded-lg p-2 text-[9px] text-ink font-medium self-start max-w-[80%]">
           学习 có nghĩa là gì? </div>

        <motion.div
          className="bg-teal/10 rounded-lg p-2 text-[9px] text-ink font-medium self-end max-w-[90%] border border-teal/20"
          initial={{ opacity: 0, x: 20 }}
          animate={
            isInView
              ? {
                  opacity: 1,
                  x: 0,
                }
              : {}
          }
          transition={{ delay: 0.5 }}
        >
          {text}

          {text.length < fullText.length && (
            <span className="animate-blink text-teal">
              |
            </span>
          )}
        </motion.div>
      </div>

      <div className="mt-2 flex gap-1">
        {[
          "Ví dụ cách dùng",
          "Chữ Hán",
          "Pinyin",
        ].map((button) => (
          <div
            key={button}
            className="text-[8px] bg-paper border border-mist rounded px-1.5 py-0.5 font-bold text-slate"
          >
            {button}
          </div>
        ))}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 5. HSK resources preview
// -----------------------------------------------------------------------------

function HskResourcesDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, {
    once: true,
    margin: "-100px",
  })

  const resources = [
    {
      height: "h-16",
      color: "bg-navy",
      label: "Bài luyện",
    },
    {
      height: "h-20",
      color: "bg-teal",
      label: "汉字",
    },
    {
      height: "h-14",
      color: "bg-violet",
      label: "Pinyin",
    },
    {
      height: "h-18",
      color: "bg-xp",
      label: "Nghĩa Việt",
    },
  ]

  return (
    <div
      ref={ref}
      className="w-full aspect-[4/3] bg-surface rounded-xl border border-mist overflow-hidden shadow-hard p-4 flex items-center justify-center"
    >
      <div className="flex gap-2 items-end">
        {resources.map((resource, i) => (
          <motion.div
            key={resource.label}
            className={`w-10 ${resource.height} ${resource.color} rounded border border-mist shadow-card flex flex-col items-center justify-end pb-1 relative`}
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={
              isInView
                ? {
                    opacity: 1,
                    y: 0,
                  }
                : {}
            }
            transition={{
              delay: 0.2 + i * 0.15,
              type: "spring",
              stiffness: 200,
            }}
            whileHover={{
              y: -5,
              scale: 1.05,
            }}
          >
            <span className="text-[7px] font-semibold text-white/90 writing-mode-vertical">
              {resource.label}
            </span>

            <motion.div
              className="absolute -top-2 -right-2"
              initial={{ scale: 0 }}
              animate={
                isInView
                  ? {
                      scale: 1,
                    }
                  : {}
              }
              transition={{
                delay: 0.8 + i * 0.1,
                type: "spring",
              }}
            >
              <Download className="h-3 w-3 text-teal" />
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 6. Gamified progress demo
// -----------------------------------------------------------------------------

function GamifiedDemo() {
  const ref = useRef<HTMLDivElement>(null)

  const isInView = useInView(ref, {
    once: true,
    margin: "-100px",
  })

  const [xpCount, setXpCount] = useState(0)

  useEffect(() => {
    if (!isInView) return

    let current = 0

    const interval = setInterval(() => {
      current += 50

      if (current >= 2450) {
        setXpCount(2450)
        clearInterval(interval)
      } else {
        setXpCount(current)
      }
    }, 30)

    return () => clearInterval(interval)
  }, [isInView])

  const progress = [
    {
      label: "Nghe hiểu",
      color: "bg-teal",
      pct: 78,
    },
    {
      label: "Đọc hiểu",
      color: "bg-navy",
      pct: 65,
    },
  ]

  return (
    <div
      ref={ref}
      className="w-full aspect-[4/3] bg-white rounded-xl border-3 border-ink overflow-hidden shadow-hard p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="animate-gem-sparkle">
            <Zap className="h-5 w-5 text-xp" />
          </div>

          <span className="text-sm font-black text-ink">
            {xpCount.toLocaleString()}  EXP </span>
        </div>

        <div className="flex items-center gap-1">
          <div className="animate-flame-flicker">
            <Target className="h-4 w-4 text-flame" />
          </div>

          <span className="text-xs font-bold text-flame">
             12 ngày </span>
        </div>
      </div>

      <div className="space-y-2">
        {progress.map((bar, i) => (
          <div key={bar.label}>
            <div className="flex justify-between text-[9px] font-bold text-slate mb-0.5">
              <span>{bar.label}</span>
              <span>{bar.pct}%</span>
            </div>

            <div className="h-2 bg-mist rounded-full overflow-hidden border border-mist">
              <motion.div
                className={`h-full ${bar.color} rounded-full`}
                initial={{ width: 0 }}
                animate={
                  isInView
                    ? {
                        width: `${bar.pct}%`,
                      }
                    : {}
                }
                transition={{
                  delay: 0.5 + i * 0.2,
                  duration: 1.2,
                  ease: "easeOut",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <motion.div
        className="mt-3 flex items-center gap-1 text-[9px] font-bold text-success"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 1.2 }}
      >
        <TrendingUp className="h-3 w-3" />
         Minh họa mục tiêu học tiếng Trung </motion.div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Feature data
// -----------------------------------------------------------------------------

const features = [
  {
    tag: "Tự luyện",
    title: "Luyện tập theo từng chủ đề HSK",
    desc: "Chọn bài luyện đã xuất bản theo kỹ năng. Đọc câu hỏi, nghe âm thanh và thực hành với nội dung tiếng Trung từ hệ thống.",
    bg: "bg-navy",
    text: "text-white",
    tagBg: "bg-teal/20",
    tagText: "text-cyan",
    tagBorder: "border-teal/30",
    checkColor: "text-cyan",
    demo: AutoGradedDemo,
  },
  {
    tag: "Bốn kỹ năng",
    title: "Nghe, nói, đọc, viết tiếng Trung",
    desc: "Chọn kỹ năng bạn muốn rèn luyện và thực hành theo cấp độ HSK. Học từng bước, theo nhịp độ của bạn.",
    bg: "bg-white",
    text: "text-ink",
    tagBg: "bg-teal/10",
    tagText: "text-teal-deep",
    tagBorder: "border-teal/20",
    checkColor: "text-success",
    demo: SkillModulesDemo,
  },
  {
    tag: "Từ vựng",
    title: "Ghi nhớ chữ Hán cùng pinyin",
    desc: "Lật thẻ để xem chữ Hán, cách đọc pinyin và nghĩa từ. Đánh dấu từ đã học để ghi nhận hoạt động học tập.",
    bg: "bg-white",
    text: "text-ink",
    tagBg: "bg-teal/10",
    tagText: "text-teal-deep",
    tagBorder: "border-teal/20",
    checkColor: "text-success",
    demo: VocabDemo,
  },
  {
    tag: "Học qua ví dụ",
    title: "Kết nối chữ Hán với cách sử dụng",
    desc: "Học một từ không chỉ qua mặt chữ: đọc pinyin, hiểu nghĩa từ và luyện dùng trong ngữ cảnh. Khung bên cạnh là ví dụ minh họa.",
    bg: "bg-navy",
    text: "text-white",
    tagBg: "bg-teal/20",
    tagText: "text-cyan",
    tagBorder: "border-teal/30",
    checkColor: "text-cyan",
    demo: AiTutorDemo,
  },
  {
    tag: "Kho nội dung HSK",
    title: "Từ vựng và bài luyện theo cấp độ",
    desc: "Nội dung được quản lý trên hệ thống HSK hiện có. Khám phá các chủ đề và chọn bài luyện phù hợp với mục tiêu của bạn.",
    bg: "bg-navy",
    text: "text-white",
    tagBg: "bg-teal/20",
    tagText: "text-cyan",
    tagBorder: "border-teal/30",
    checkColor: "text-cyan",
    demo: HskResourcesDemo,
  },
  {
    tag: "Theo dõi học tập",
    title: "Mục tiêu rõ ràng, học đều mỗi ngày",
    desc: "Xem cấp độ, EXP và chuỗi ngày học từ tài khoản. Đặt cấp độ HSK hiện tại và mục tiêu để định hướng việc học.",
    bg: "bg-cyan-light",
    text: "text-ink",
    tagBg: "bg-teal/10",
    tagText: "text-teal-deep",
    tagBorder: "border-teal/20",
    checkColor: "text-success",
    demo: GamifiedDemo,
  },
]

const checkItems = [
  "Bài luyện HSK",
  "Từ vựng tiếng Trung",
  "Mục tiêu cá nhân",
]

// -----------------------------------------------------------------------------
// Feature Showcase
// -----------------------------------------------------------------------------

export function FeatureShowcase() {
  return (
    <section
      id="features"
      className="relative overflow-hidden"
    >
      <div className="space-y-0">
        {features.map((feature, i) => {
          const DemoComponent = feature.demo

          return (
            <motion.div
              key={feature.title}
              initial={{
                opacity: 0,
                y: 50,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                margin: "-100px",
              }}
              transition={{
                duration: 0.6,
              }}
              className={`py-20 md:py-28 ${feature.bg}`}
            >
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                  <div
                    className={
                      i % 2 === 1
                        ? "lg:order-2"
                        : ""
                    }
                  >
                    <div
                      className={`inline-flex items-center gap-2 rounded-full border-2 ${feature.tagBorder} ${feature.tagBg} px-3 py-1 text-xs font-black ${feature.tagText} uppercase tracking-wider mb-4`}
                    >
                      {feature.tag}
                    </div>

                    <h3
                      className={`text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter ${feature.text} mb-4 leading-[1.2]`}
                    >
                      {feature.title}
                    </h3>

                    <p
                      className={`text-lg leading-relaxed mb-6 ${
                        feature.bg === "bg-navy"
                          ? "text-white/80"
                          : "text-slate"
                      } font-medium`}
                    >
                      {feature.desc}
                    </p>

                    <ul className="space-y-2">
                      {checkItems.map((item) => (
                        <li
                          key={item}
                          className={`flex items-center gap-2 text-sm font-bold ${feature.text}`}
                        >
                          <Check
                            className={`h-4 w-4 ${feature.checkColor}`}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div
                    className={
                      i % 2 === 1
                        ? "lg:order-1"
                        : ""
                    }
                  >
                    <TiltCard
                      tiltAmount={8}
                      glowColor={
                        feature.bg === "bg-navy"
                          ? "rgba(120, 255, 249, 0.15)"
                          : "rgba(14, 165, 153, 0.12)"
                      }
                    >
                      <DemoComponent />
                    </TiltCard>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
