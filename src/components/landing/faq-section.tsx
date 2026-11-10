"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Minus } from "lucide-react"

const faqs = [
  {
    "q": "TriceHSK giúp tôi học những gì?",
    "a": "Bạn có thể học từ vựng với chữ Hán, pinyin và nghĩa từ; khám phá chủ đề HSK và luyện nghe, nói, đọc, viết qua các bài đã xuất bản."
  },
  {
    "q": "Tôi đăng ký tài khoản như thế nào?",
    "a": "Mở trang Đăng ký, nhập tên người dùng, email và mật khẩu. Sau đó chờ quản trị viên duyệt tài khoản. Khi tài khoản được duyệt, bạn có thể đăng nhập và bắt đầu học."
  },
  {
    "q": "Tôi đặt mục tiêu HSK ở đâu?",
    "a": "Sau khi đăng nhập, mở Hồ sơ và cài đặt để chọn cấp độ HSK hiện tại và cấp độ mục tiêu từ 1 đến 9."
  },
  {
    "q": "Tôi có thể học trên điện thoại không?",
    "a": "Bạn có thể mở website bằng trình duyệt điện thoại, máy tính bảng hoặc máy tính. Thanh điều hướng trên màn hình nhỏ nằm trong nút menu."
  },
  {
    "q": "Bài tự luyện có lưu điểm và lịch sử không?",
    "a": "Sau khi nộp và lưu thành công, kết quả được ghi vào Lịch sử bài làm theo tài khoản. Bạn có thể xem lại câu trả lời, tỷ lệ đúng và kết quả từng phần; luyện nói và luyện nét có chỉ số đánh giá riêng."
  },
  {
    "q": "Làm sao để ôn từ vựng?",
    "a": "Mở mục Từ vựng, tìm theo chữ Hán, pinyin hoặc nghĩa từ rồi lật thẻ để ôn. Bấm Đánh dấu đã học để ghi nhận hoạt động học từ."
  }
]

function FAQItem({ item, isOpen, onClick }: { item: typeof faqs[0]; isOpen: boolean; onClick: () => void }) {
  return (
    <div className="border-b-2 border-[var(--mist)]">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between py-6 text-left"
      >
        <span className="text-base md:text-lg font-bold text-[#0F1720] pr-4">{item.q}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--mist)] text-[var(--navy)]"
        >
          {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-[#334155] leading-relaxed">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-20 md:py-28 bg-[#F0FDFC]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-block text-sm font-bold tracking-widest text-[var(--teal)] uppercase mb-3">
             Câu hỏi thường gặp </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#0F1720]">
             Giải đáp trước khi bắt đầu </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-[var(--radius-lg)] border-2 border-[var(--mist)] bg-[var(--white)] px-6 md:px-8"
        >
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              item={faq}
              isOpen={openIndex === i}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
