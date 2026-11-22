import { LayoutDashboard, BookOpen, Languages, Headphones, Trophy, FileText, Gamepad2, BarChart3, History } from "lucide-react";

export const STUDENT_NAV = [
  { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { label: "Bài học", href: "/learning", icon: BookOpen },
  { label: "Từ vựng", href: "/vocabulary", icon: Languages },
  { label: "Luyện tập", href: "/practice", icon: Headphones },
  { label: "Đề thi", href: "/exams", icon: FileText },
  { label: "Game PK", href: "/games", icon: Gamepad2 },
  { label: "Xếp hạng", href: "/leaderboard", icon: BarChart3 },
  { label: "Thành tích", href: "/rewards", icon: Trophy },
  { label: "Lịch sử bài làm", href: "/history", icon: History },
];

export const PUBLIC_NAV = [
  { label: "Cách học", href: "/#how-it-works", icon: BookOpen },
  { label: "Tính năng", href: "/#features", icon: Languages },
  { label: "Lộ trình HSK", href: "/#roadmap", icon: LayoutDashboard },
  { label: "Cấp độ", href: "/#levels", icon: Trophy },
  { label: "Câu hỏi", href: "/#faq", icon: Headphones },
];

export function isActiveRoute(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
}
