"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { Check, Zap } from "lucide-react"
import { NavigationLink as Link } from "@/components/shell/navigation-protection";
import { TiltCard } from "@/components/ui/tilt-card"

const plans = [
  {
    "name": "Nền tảng",
    "level": "HSK 1–3",
    "description": "Bắt đầu với tiếng Trung và xây dựng thói quen học.",
    "features": [
      "Nhận diện chữ Hán và pinyin",
      "Làm quen từ vựng theo chủ đề",
      "Luyện nghe và đọc từng bước",
      "Ôn từ vựng mỗi ngày"
    ],
    "cta": "Bắt đầu học",
    "ctaStyle": "outline",
    "popular": false
  },
  {
    "name": "Phát triển",
    "level": "HSK 4–6",
    "description": "Tiếp tục mở rộng vốn từ và luyện các kỹ năng.",
    "features": [
      "Mở rộng chủ đề từ vựng",
      "Luyện nghe, nói, đọc, viết",
      "Thực hành với bài đã xuất bản",
      "Theo dõi mục tiêu trong hồ sơ"
    ],
    "cta": "Đặt mục tiêu HSK",
    "ctaStyle": "filled",
    "popular": true
  },
  {
    "name": "Nâng cao",
    "level": "HSK 7–9",
    "description": "Chủ động chọn mục tiêu và nội dung nâng cao.",
    "features": [
      "Khám phá nội dung theo cấp độ",
      "Ôn chữ Hán cùng cách sử dụng",
      "Luyện tập theo kỹ năng",
      "Duy trì việc ôn tập cá nhân"
    ],
    "cta": "Khám phá lộ trình",
    "ctaStyle": "outline",
    "popular": false
  }
]

export function PricingSection() {


  const ref = useRef(null)

  return (
    <section
      id="levels"
      ref={ref}
      className="py-20 md:py-28 bg-white"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-block text-sm font-black tracking-widest text-teal uppercase mb-3">
            Cấp độ HSK
          </span>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-ink leading-[1.2]">
            Chọn cấp độ phù hợp với bạn
          </h2>

          <p className="mt-4 text-lg text-slate max-w-2xl mx-auto font-medium">
            Đặt mục tiêu HSK trong hồ sơ, rồi học và luyện tập theo nhịp độ của bạn.
          </p>

        </motion.div>

        {/* Cấp độ HSK Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: i * 0.1,
              }}
            >
              <TiltCard
                tiltAmount={plan.popular ? 5 : 3}
                glowColor={
                  plan.popular
                    ? "rgba(14, 165, 153, 0.2)"
                    : "rgba(14, 165, 153, 0.08)"
                }
              >
                <div
                  className={`relative rounded-2xl border-3 p-8 h-full flex flex-col transition-all hover:-translate-y-1 ${
                    plan.popular
                      ? "border-teal bg-teal/5 shadow-brutalist"
                      : "border-ink bg-white shadow-hard"
                  }`}
                >
                  {/* Tiếp tục tiến bộ Badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-teal text-white text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider border-2 border-ink shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1 whitespace-nowrap">
                        <Zap className="h-3 w-3" />
                        Tiếp tục tiến bộ
                      </span>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="mb-6">
                    <div className="text-sm font-black tracking-widest text-slate uppercase mb-2">
                      {plan.name}
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl lg:text-5xl font-black text-ink">
                        {plan.level}
                      </span>

                    </div>

                    <p className="mt-2 text-sm text-slate font-medium">
                      {plan.description}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm text-slate"
                      >
                        <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />

                        <span className="font-bold">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href="/register"
                    className={`block text-center w-full py-3 rounded-xl font-black text-base transition-all hover:scale-[1.02] border-3 ${
                      plan.ctaStyle === "filled"
                        ? "bg-navy hover:bg-navy-deep text-white border-navy shadow-hard hover:shadow-brutalist"
                        : "border-ink bg-white text-ink shadow-hard hover:shadow-brutalist hover:bg-paper"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
