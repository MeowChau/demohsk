"use client"

import { NavigationLink as Link } from "@/components/shell/navigation-protection";
import { BrandLogo } from "@/components/ui/brand-logo"

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
              <BrandLogo className="h-12 w-12" sizes="48px" />
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
                {links.map((link) => {
                  const Item = link.href.startsWith("/#") ? "a" : Link
                  return (
                    <li key={link.label}>
                      <Item
                        href={link.href}
                        className="text-sm font-medium text-slate-400 hover:text-[#78FFF9] transition-colors"
                      >
                        {link.label}
                      </Item>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">
             © 2026 TriceHSK. Cùng bạn học tiếng Trung mỗi ngày. </p>
        </div>
      </div>
    </footer>
  )
}
