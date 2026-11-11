"use client"

import { motion } from "framer-motion"
import { Target, BookOpen, TrendingUp } from "lucide-react"


const steps = [
  {
    num: "01",
    color: "bg-cyan",
    icon: Target,
    title: "Đặt mục tiêu HSK",
    desc: "Tạo tài khoản, chọn cấp độ HSK hiện tại và đặt cấp độ bạn muốn đạt được trong hồ sơ.",
  },
  {
    num: "02",
    color: "bg-yellow-300",
    icon: BookOpen,
    title: "Học từ vựng và chủ đề",
    desc: "Khám phá chữ Hán, pinyin, nghĩa từ và bài luyện được xuất bản theo chủ đề.",
  },
  {
    num: "03",
    color: "bg-blue-300",
    icon: TrendingUp,
    title: "Luyện tập và ôn lại",
    desc: "Luyện từng kỹ năng, đánh dấu từ đã học và theo dõi mục tiêu cùng hoạt động học của bạn.",
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-20 md:py-28 bg-white relative"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            duration: 0.5,
          }}
          className="mb-16"
        >
          <span className="inline-block text-sm font-black tracking-widest text-teal uppercase mb-3">
             Cách học </span>

          <h2 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter text-ink leading-[1.2]">
             Bắt đầu học với ba bước </h2>
        </motion.div>

        {/* Steps */}
        <div className="relative">


          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{
                  opacity: 0,
                  y: 40,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.2,
                  type: "spring",
                  stiffness: 100,
                }}
              >
                <motion.div
                  whileHover={{
                    y: -10,
                    transition: {
                      type: "spring",
                      stiffness: 400,
                      damping: 20,
                    },
                  }}
                  className="rounded-2xl border-3 border-ink bg-white p-8 h-full shadow-hard hover:shadow-brutalist transition-shadow"
                >
                  {/* Number + icon */}
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${step.color} border-3 border-ink shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}
                    >
                      <span className="text-lg font-black text-ink">
                        {step.num}
                      </span>
                    </div>

                    <motion.div
                      animate={{
                        rotate: [-2, 2, -2],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 3,
                        delay: i * 0.5,
                      }}
                      className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10 border-2 border-teal/20"
                    >
                      <step.icon className="h-6 w-6 text-teal" />
                    </motion.div>
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-black text-ink mb-3 tracking-tight">
                    {step.title}
                  </h3>

                  <p className="text-slate leading-relaxed font-medium">
                    {step.desc}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
