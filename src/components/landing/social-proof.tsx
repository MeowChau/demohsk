"use client"

import { motion, useInView } from "framer-motion"
import { Star, Quote } from "lucide-react"
import { useRef, useState, useEffect } from "react"
import { TiltCard } from "@/components/ui/tilt-card"

const testimonials = [
  {
    "quote": "Xin chào! · Nǐ hǎo!",
    "name": "你好",
    "score": "Chào hỏi",
    "location": "Giao tiếp hằng ngày",
    "image": "",
    "gradient": "from-navy to-teal"
  },
  {
    "quote": "Cảm ơn. · Xièxie.",
    "name": "谢谢",
    "score": "Lịch sự",
    "location": "Giao tiếp hằng ngày",
    "image": "",
    "gradient": "from-teal to-cyan"
  },
  {
    "quote": "Tôi học tiếng Trung. · Wǒ xuéxí Zhōngwén.",
    "name": "我学习中文。",
    "score": "Học tập",
    "location": "Câu ví dụ",
    "image": "",
    "gradient": "from-violet to-navy"
  },
  {
    "quote": "Tạm biệt! · Zàijiàn!",
    "name": "再见",
    "score": "Chào tạm biệt",
    "location": "Giao tiếp hằng ngày",
    "image": "",
    "gradient": "from-navy to-violet"
  },
  {
    "quote": "Bạn tên là gì? · Nǐ jiào shénme míngzi?",
    "name": "你叫什么名字？",
    "score": "Giới thiệu",
    "location": "Câu ví dụ",
    "image": "",
    "gradient": "from-cyan to-teal"
  },
  {
    "quote": "Cố lên! · Jiāyóu!",
    "name": "加油",
    "score": "Động viên",
    "location": "Giao tiếp hằng ngày",
    "image": "",
    "gradient": "from-teal to-navy"
  }
]

/**
 * Animated scramble effect for the main social-proof headline.
 */
function ScrambleText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const ref = useRef<HTMLHeadingElement>(null)
  const isInView = useInView(ref, {
    once: true,
    margin: "-100px",
  })

  const [display, setDisplay] = useState("")

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"

  useEffect(() => {
    if (!isInView) return

    let iteration = 0

    const interval = setInterval(() => {
      setDisplay(
        text
          .split("")
          .map((char, index) => {
            if (
              char === " " ||
              char === "." ||
              char === "'" ||
              char === "?"
            ) {
              return char
            }

            if (index < iteration) {
              return text[index]
            }

            return chars[Math.floor(Math.random() * chars.length)]
          })
          .join(""),
      )

      iteration += 1 / 2

      if (iteration >= text.length) {
        clearInterval(interval)
        setDisplay(text)
      }
    }, 25)

    return () => clearInterval(interval)
  }, [isInView, text])

  return (
    <h2 ref={ref} className={className}>
      {display || text.split("").map(() => " ").join("")}
    </h2>
  )
}

/**
 * Animated five-star rating.
 */
function StarBurst() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      whileInView={{ scale: 1 }}
      viewport={{ once: true }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
      className="flex items-center gap-0.5"
    >
      {[...Array(5)].map((_, index) => (
        <motion.div
          key={index}
          initial={{ rotate: 0, scale: 0 }}
          whileInView={{ rotate: 360, scale: 1 }}
          viewport={{ once: true }}
          transition={{
            delay: index * 0.1,
            type: "spring",
            stiffness: 200,
          }}
        >
          <Star className="h-4 w-4 fill-xp text-xp" />
        </motion.div>
      ))}
    </motion.div>
  )
}

/**
 * Individual testimonial card.
 *
 * Uses TiltCard from the newer UI version while preserving
 * the stronger brutalist styling and animations.
 */
function TestimonialCard({
  testimonial,
  index,
}: {
  testimonial: (typeof testimonials)[number]
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        delay: index * 0.1,
        type: "spring",
        stiffness: 100,
      }}
      className="min-w-[300px] shrink-0 md:min-w-[350px]"
    >
      <TiltCard
        tiltAmount={5}
        glowColor="rgba(14, 165, 153, 0.08)"
      >
        <div className="group relative flex h-full flex-col rounded-2xl border-3 border-ink bg-white p-5 shadow-hard transition-all hover:-translate-y-1 hover:shadow-brutalist">
          {/* Rating */}
          <span className="text-xs font-bold text-teal">汉字 · Pinyin · Tiếng Việt</span>

          {/* Quote icon */}
          <Quote className="mt-3 mb-2 h-5 w-5 text-teal/30" />

          {/* Testimonial */}
          <p className="mb-4 flex-1 text-sm font-medium leading-relaxed text-slate">
            "{testimonial.quote}"
          </p>

          {/* Student information */}
          <div className="flex items-center gap-3 border-t-2 border-mist pt-3">
            <div
              className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br ${testimonial.gradient} ring-2 ring-mist`}
            >
              <span className="flex h-full w-full items-center justify-center text-xl font-bold text-white" lang="zh-CN">{testimonial.name.slice(0,1)}</span>
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-black text-ink">
                {testimonial.name}
              </div>

              <div className="text-xs font-bold text-slate">
                {testimonial.score} · {testimonial.location}
              </div>
            </div>
          </div>
        </div>
      </TiltCard>
    </motion.div>
  )
}

/**
 * Infinite horizontal testimonial marquee.
 */
function InfiniteMarquee({
  children,
  direction = "left",
}: {
  children: React.ReactNode
  direction?: "left" | "right"
}) {
  return (
    <div className="relative overflow-hidden">
      {/* Edge fade */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-paper to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-paper to-transparent" />

      <motion.div
        className="flex w-max gap-4"
        animate={{
          x: direction === "left" ? [0, -1000] : [-1000, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 30,
          ease: "linear",
        }}
      >
        {children}
        {children}
      </motion.div>
    </div>
  )
}

export function SocialProof() {
  const firstRow = testimonials.slice(0, 3)
  const secondRow = testimonials.slice(3, 6)

  return (
    <section
      id="chinese-phrases"
      className="relative overflow-hidden"
    >
      {/* =========================================================
          BIG STATEMENT
      ========================================================= */}
      <div className="bg-cyan py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <ScrambleText
              text="Mỗi ngày một chút tiếng Trung."
              className="mb-6 text-5xl font-black leading-[1.12] tracking-tighter text-ink md:text-7xl lg:text-8xl"
            />

            <p className="mx-auto max-w-2xl text-lg font-medium text-slate md:text-xl">
              Cùng làm quen với những cách nói ngắn gọn qua chữ Hán, pinyin và nghĩa từ.
            </p>
          </motion.div>
        </div>
      </div>

      {/* =========================================================
          TESTIMONIALS
      ========================================================= */}
      <div className="bg-paper py-12 md:py-16">
        {/* Section heading */}
        <div className="mb-8 px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="mb-2 inline-block text-sm font-black uppercase tracking-widest text-teal">
              Góc tiếng Trung
            </span>

            <h3 className="text-3xl font-black tracking-tighter text-ink md:text-4xl">
              Những câu giao tiếp để bắt đầu
            </h3>
          </motion.div>
        </div>

        {/* Desktop / mobile infinite testimonial rows */}
        <div className="space-y-4">
          <InfiniteMarquee direction="left">
            {firstRow.map((testimonial, index) => (
              <TestimonialCard
                key={`first-${testimonial.name}`}
                testimonial={testimonial}
                index={index}
              />
            ))}
          </InfiniteMarquee>

          <InfiniteMarquee direction="right">
            {secondRow.map((testimonial, index) => (
              <TestimonialCard
                key={`second-${testimonial.name}`}
                testimonial={testimonial}
                index={index + 3}
              />
            ))}
          </InfiniteMarquee>
        </div>
      </div>
    </section>
  )
}
