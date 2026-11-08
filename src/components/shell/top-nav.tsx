"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { STUDENT_NAV, isActiveRoute } from "@/lib/navigation";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { LogoutButton } from "@/components/shell/logout-button";
import { FeatureMenu } from "./feature-menu";

export type NavRole = "student" | "teacher" | "admin";

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

function getInitials(name: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TopNav({ 
  role, 
  displayName, 
  avatarUrl 
}: { 
  role: NavRole; 
  displayName: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const scrolled = useScrolled();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const items = STUDENT_NAV;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b bg-[var(--cyan)] transition-all duration-300 ${
          scrolled
            ? "border-mist shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:border-slate/20 dark:bg-navy-deep/95"
            : "border-transparent dark:bg-navy-deep/60"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-full items-center justify-between px-2 sm:px-3 lg:px-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/favicon.ico" unoptimized
                alt="TriceHSK"
                width={60}
                height={30}
                className="h-10 w-10 object-contain [filter:drop-shadow(1px_0_0_#fff)_drop-shadow(-1px_0_0_#fff)_drop-shadow(0_1px_0_#fff)_drop-shadow(0_-1px_0_#fff)]"
              />
              <span className="text-xl font-extrabold tracking-tight text-navy dark:text-white">
                TriceHSK
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex xl:items-center xl:gap-1">
            {items.slice(0, 6).map((item) => {
              const isActive = isActiveRoute(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href} aria-current={isActive ? "page" : undefined}
                  className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-paper text-ink shadow-sm ring-1 ring-mist dark:bg-white/[0.06] dark:text-white dark:ring-white/10"
                      : "text-slate hover:bg-mist/60 hover:text-ink dark:text-slate-soft dark:hover:bg-white/5 dark:hover:text-white"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />{item.label}
                </Link>
              );
            })}
            <FeatureMenu />
          </nav>

          {/* Right Utilities */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* User Dropdown */}
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserOpen(!userOpen)} aria-label="Mở menu tài khoản" aria-expanded={userOpen}
                className={`flex items-center gap-2 rounded-full p-1 pr-3 transition-colors ${
                  userOpen
                    ? "bg-mist dark:bg-white/10"
                    : "hover:bg-mist/60 dark:hover:bg-white/5"
                }`}
              >
                <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-navy text-xs font-bold text-white dark:bg-teal">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={displayName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    getInitials(displayName)
                  )}
                </div>
                <span className="hidden max-w-[120px] truncate text-sm font-medium text-ink dark:text-white lg:block">
                  {displayName}
                </span>
                <svg
                  className={`h-4 w-4 text-slate transition-transform duration-200 ${
                    userOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {userOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-mist bg-white p-1.5 shadow-lg ring-1 ring-black/5 dark:border-slate/20 dark:bg-slate-900 dark:ring-white/10">
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy text-xs font-bold text-white dark:bg-teal">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={displayName}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        getInitials(displayName)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink dark:text-white truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-slate dark:text-slate-soft truncate">
                         Đã đăng nhập </p>
                    </div>
                  </div>
                  <div className="h-px bg-mist dark:bg-slate/20" />
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate transition-colors hover:bg-mist hover:text-ink dark:text-slate-soft dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                     Hồ sơ và cài đặt </Link>
                  <div className="h-px bg-mist dark:bg-slate/20" />
                  <div className="px-1 py-1">
                    <div className="px-1 py-1">
                      <LogoutButton className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate transition-colors hover:bg-mist hover:text-ink dark:text-slate-soft dark:hover:bg-white/5 dark:hover:text-white">
                        <svg
                          className="h-4 w-4 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                         Đăng xuất </LogoutButton>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Đóng điều hướng" : "Mở điều hướng"} aria-expanded={mobileOpen}
              className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate transition-colors hover:bg-mist dark:text-slate-soft dark:hover:bg-white/5 xl:hidden"
            >
              {mobileOpen ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Sheet */}
      {mobileOpen && (
        <div className="fixed inset-x-0 top-16 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-mist bg-surface p-4 shadow-lg dark:border-slate/20 xl:hidden">
          <nav className="flex flex-col gap-1">
            {items.map((item) => {
              const isActive = isActiveRoute(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href} aria-current={isActive ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-paper text-ink shadow-sm ring-1 ring-mist dark:bg-white/[0.06] dark:text-white dark:ring-white/10"
                      : "text-slate hover:bg-mist/60 hover:text-ink dark:text-slate-soft dark:hover:bg-white/5 dark:hover:text-white"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />{item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
