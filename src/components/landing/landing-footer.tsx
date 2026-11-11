"use client"

import Image from "next/image"
import Link from "next/link"

const footerLinks = {
  "Khám phá": [
    {
      "label": "Cách học",
      "href": "/#how-it-works"
    },
    {
      "label": "Tính năng",
      "href": "/#features"
    },
    {
      "label": "Lộ trình HSK",
      "href": "/#roadmap"
    },
    {
      "label": "Cấp độ HSK",
      "href": "/#levels"
    }
  ],
  "Học tiếng Trung": [
    {
      "label": "Bài học",
      "href": "/learning"
    },
    {
      "label": "Từ vựng",
      "href": "/vocabulary"
    },
    {
      "label": "Luyện nghe",
      "href": "/practice/listening"
    },
    {
      "label": "Luyện đọc",
      "href": "/practice/reading"
    }
  ],
  "Luyện tập": [
    {
      "label": "Luyện viết",
      "href": "/practice/writing"
    },
    {
      "label": "Luyện nói",
      "href": "/practice/speaking"
    },
    {
      "label": "Thành tích",
      "href": "/rewards"
    },
    {
      "label": "Góc tiếng Trung",
      "href": "/#chinese-phrases"
    }
  ]
}

export function LandingFooter() {
  return (
    <footer className="bg-[#0F1720] pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src="/favicon.ico" unoptimized
                alt="TriceHSK"
                width={90}
                height={30}
                className="h-12 w-12 object-contain [filter:drop-shadow(1px_0_0_#fff)_drop-shadow(-1px_0_0_#fff)_drop-shadow(0_1px_0_#fff)_drop-shadow(0_-1px_0_#fff)]"
              />
              <span className="text-xl font-extrabold tracking-tight text-white dark:text-white">
                TriceHSK
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
               Học tiếng Trung theo mục tiêu của bạn. Từ chữ Hán và pinyin đến những bài luyện HSK mỗi ngày. </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm font-medium text-slate-400 hover:text-[#78FFF9] transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
             © 2026 TriceHSK. Cùng bạn học tiếng Trung mỗi ngày. </p>
        </div>
      </div>
    </footer>
  )
}
