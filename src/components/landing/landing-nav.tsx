"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { STUDENT_NAV, PUBLIC_NAV, isActiveRoute } from "@/lib/navigation"
import { Menu, UserRound, X } from "lucide-react"
import Image from "next/image"
import { NavigationLink as Link } from "@/components/shell/navigation-protection";
import { usePathname } from "next/navigation"
import { LogoutButton } from "@/components/shell/logout-button"
import { ThemeToggle } from "@/components/shell/theme-toggle"
import { FeatureMenu } from "@/components/shell/feature-menu"
import type { NavRole } from "@/components/shell/top-nav"

const publicActionClassName = "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border-2 font-bold leading-none transition-colors"

function getInitials(name: string) {
  if (!name) return "U"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface LandingNavProps {
  user?: {
    id: string
    email?: string | null
  } | null
  displayName?: string
  role?: NavRole
  avatarUrl?: string | null
  authenticated?: boolean
  variant?: "landing" | "app"
}

export function LandingNav({
  user,
  authenticated = !!user,
  displayName = "",
  avatarUrl,
  variant = "landing",
}: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const reducedMotion = useReducedMotion()
  const solidSurface = scrolled || mobileOpen
  const isLanding = variant === "landing"
  const avatarSurface = avatarUrl ? "bg-[var(--mist)] text-[var(--slate)]" : "bg-[var(--navy)] text-white"

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Safari may tint browser chrome from the document/fixed header instead of
  // theme-color alone. Keep all three surfaces on the same opaque theme token.
  useEffect(() => {
    const root = document.documentElement
    const previousRootColor = root.style.backgroundColor
    const previousBodyColor = document.body.style.backgroundColor
    const existingTags = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))
    const ownedTag = existingTags.length ? null : document.createElement("meta")
    if (ownedTag) {
      ownedTag.name = "theme-color"
      document.head.appendChild(ownedTag)
    }
    const tags = ownedTag ? [ownedTag] : existingTags
    const previousContents = tags.map(tag => tag.getAttribute("content"))

    const syncColor = () => {
      const color = getComputedStyle(root)
        .getPropertyValue(solidSurface ? "--white" : "--header-background")
        .trim()
      if (!color) return
      root.style.backgroundColor = color
      document.body.style.backgroundColor = color
      tags.forEach(tag => tag.setAttribute("content", color))
    }
    syncColor()
    // next-themes applies its class after child effects. Observe the applied
    // class so manual, system and cross-tab theme changes use the final tokens.
    const observer = new MutationObserver(syncColor)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })

    return () => {
      observer.disconnect()
      root.style.backgroundColor = previousRootColor
      document.body.style.backgroundColor = previousBodyColor
      if (ownedTag) ownedTag.remove()
      else tags.forEach((tag, index) => {
        const content = previousContents[index]
        if (content === null) tag.removeAttribute("content")
        else if (content !== undefined) tag.setAttribute("content", content)
      })
    }
  }, [solidSurface])

  useEffect(() => {
    setMobileOpen(false)
    setUserOpen(false)
  }, [pathname])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setUserOpen(false)
        setMobileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const isLoggedIn = authenticated
  const roleLinks = STUDENT_NAV.slice(0, 6)
  const mobileLinks = STUDENT_NAV
  const navLinks = PUBLIC_NAV

  return (
    <>
      <motion.header
        initial={isLanding && !reducedMotion ? { y: -100 } : false}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        data-solid-surface={solidSurface}
        className={`hsk-site-header ${isLanding ? "fixed inset-x-0" : "sticky w-full"} top-0 z-50 h-20 border-b-2 transition-colors duration-300 motion-reduce:transition-none ${
          solidSurface
            ? "bg-[var(--white)]/80 backdrop-blur-xl border-[var(--mist)] shadow-sm dark:border-slate/20"
            : "bg-[var(--header-background)] border-transparent dark:bg-navy-deep/60"
        }`}
      >
        <div className="mx-auto h-full max-w-full px-4 sm:px-6 lg:px-8">
          <div className="grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <Link href="/" aria-label="Trang chính TriceHSK" className="flex items-center justify-self-start gap-2 whitespace-nowrap"
              onClick={event => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                setMobileOpen(false);
                setUserOpen(false);
                if (pathname === "/") window.scrollTo({ top: 0, behavior: "instant" });
              }}>
              <Image
                src="/favicon.ico" unoptimized
                alt="TriceHSK"
                width={90}
                height={30}
                className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12 [filter:drop-shadow(1px_0_0_#fff)_drop-shadow(-1px_0_0_#fff)_drop-shadow(0_1px_0_#fff)_drop-shadow(0_-1px_0_#fff)]"
              />
              <span className="text-xl font-extrabold tracking-tight text-navy dark:text-white">
                TriceHSK
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav aria-label="Điều hướng chính" className="hidden items-center justify-self-center gap-3 whitespace-nowrap xl:flex 2xl:gap-6">
              {isLoggedIn ? (
                <>
                  {roleLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={isActiveRoute(pathname, link.href) ? "page" : undefined}
                      className={`text-sm font-semibold transition-colors ${
                        scrolled ? "text-[var(--slate)] hover:text-navy dark:hover:text-white" : "text-ink/80 hover:text-ink dark:text-slate dark:hover:text-white"
                      } ${isActiveRoute(pathname, link.href) ? "!text-navy dark:!text-white" : ""}`}
                    >
                      <link.icon className="mr-1.5 inline-block h-4 w-4 shrink-0 align-[-2px]" aria-hidden="true" />{link.label}
                    </Link>
                  ))}
                  <FeatureMenu />
                </>
              ) : (
                navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-semibold transition-colors ${
                      scrolled ? "text-[var(--slate)] hover:text-navy" : "text-ink/80 hover:text-ink"
                    }`}
                  >
                    <link.icon className="mr-1.5 inline-block h-4 w-4 shrink-0 align-[-2px]" aria-hidden="true" />{link.label}
                  </a>
                ))
              )}
            </nav>

            {/* Right side */}
            <div className="flex min-w-0 items-center justify-self-end gap-2 sm:gap-3">
              {isLoggedIn && !isLanding && <div className="hidden sm:block"><ThemeToggle /></div>}
              {isLoggedIn ? (
                <div className="relative" ref={userRef}>
                  <button
                    type="button"
                    onClick={() => setUserOpen(!userOpen)}
                    aria-label="Mở menu tài khoản"
                    aria-expanded={userOpen}
                    className={`flex items-center gap-2 rounded-full p-1 pr-3 transition-colors ${
                      userOpen
                        ? "bg-[var(--mist)] dark:bg-ink/10"
                        : "hover:bg-[var(--mist)]/60 dark:hover:bg-ink/5"
                    }`}
                  >
                    <div className={`relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold ${avatarSurface}`}>
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
                    <span className="hidden max-w-[64px] truncate text-sm font-medium text-[var(--ink)] dark:text-white xl:block 2xl:max-w-[120px]">
                      {displayName}
                    </span>
                    <svg
                      className={`h-4 w-4 text-[var(--slate)] transition-transform duration-200 ${
                        userOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {userOpen && (
                    <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-[var(--mist)] bg-white p-1.5 shadow-lg ring-1 ring-black/5 dark:border-slate/20 dark:bg-slate-900 dark:ring-white/10">
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold ${avatarSurface}`}>
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
                          <p className="text-sm font-semibold text-[var(--ink)] dark:text-white truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-[var(--slate)] dark:text-slate-soft truncate">
                             Đã đăng nhập </p>
                        </div>
                      </div>
                      <div className="h-px bg-[var(--mist)] dark:bg-slate/20" />
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--slate)] transition-colors hover:bg-[var(--mist)] hover:text-[var(--ink)] dark:text-slate-soft dark:hover:bg-ink/5 dark:hover:text-white"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                         Hồ sơ và cài đặt </Link>
                      <div className="h-px bg-[var(--mist)] dark:bg-slate/20" />
                      <div className="px-1 py-1">
                        <LogoutButton className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--slate)] transition-colors hover:bg-[var(--mist)] hover:text-[var(--ink)] dark:text-slate-soft dark:hover:bg-ink/5 dark:hover:text-white">
                          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                           Đăng xuất </LogoutButton>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden items-center gap-3 xl:flex">
                  <Link
                    href="/login"
                    className={`${publicActionClassName} h-11 w-[132px] px-4 text-sm ${
                      scrolled
                        ? "text-navy border-[var(--navy)]/10 hover:border-[var(--navy)]/30"
                        : "text-ink border-[#0F1720]/20 hover:border-[#0F1720]/40"
                    }`}
                  >
                     Đăng nhập </Link>
                  <Link
                    href="/register"
                    className={`${publicActionClassName} h-11 w-[132px] px-4 text-sm text-white bg-[var(--navy)] hover:bg-[var(--navy-deep)] border-[var(--navy)]`}
                  >
                     Bắt đầu học </Link>
                </div>
              )}

              {/* Mobile toggle */}
              <button
                type="button"
                className="xl:hidden p-2 text-ink dark:text-slate"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Đóng điều hướng" : "Mở điều hướng"}
                aria-expanded={mobileOpen}
                aria-controls="site-mobile-navigation"
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="site-mobile-navigation"
            initial={reducedMotion ? false : { opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 overflow-y-auto bg-[var(--white)] px-6 pb-8 pt-24 xl:hidden"
          >
            <nav className="flex flex-col gap-4">
              {isLoggedIn ? (
                <>
                  <div className="flex items-center gap-3 pb-4 border-b-2 border-[var(--mist)]">
                    <div className={`relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full text-sm font-bold ${avatarSurface}`}>
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
                    <div>
                      <p className="text-base font-bold text-navy dark:text-white">{displayName}</p>
                      <p className="text-xs text-[var(--slate)]"> Đã đăng nhập </p>
                    </div>
                  </div>
                  {mobileLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={isActiveRoute(pathname, link.href) ? "page" : undefined}
                      onClick={() => setMobileOpen(false)}
                      className="text-lg font-bold text-navy dark:text-white py-3 border-b-2 border-[var(--mist)]"
                    >
                      <link.icon className="mr-1.5 inline-block h-4 w-4 shrink-0 align-[-2px]" aria-hidden="true" />{link.label}
                    </Link>
                  ))}
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="text-lg font-bold text-navy dark:text-white py-3 border-b-2 border-[var(--mist)]"
                  >
                    <UserRound className="mr-1.5 inline-block h-4 w-4 shrink-0 align-[-2px]" aria-hidden="true" />Hồ sơ và cài đặt
                  </Link>
                  <div className="mt-4">
                    <LogoutButton className="w-full text-center text-base font-bold text-danger border-2 border-danger/20 rounded-full py-3">
                       Đăng xuất </LogoutButton>
                  </div>
                </>
              ) : (
                <>
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-lg font-bold text-navy py-3 border-b-2 border-[var(--mist)]"
                    >
                      <link.icon className="mr-1.5 inline-block h-4 w-4 shrink-0 align-[-2px]" aria-hidden="true" />{link.label}
                    </a>
                  ))}
                  <div className="mt-4 flex flex-col gap-3">
                    <Link
                      href="/login"
                      className={`${publicActionClassName} h-12 w-full px-5 text-base text-navy border-[var(--navy)]/10`}
                    >
                       Đăng nhập </Link>
                    <Link
                      href="/register"
                      className={`${publicActionClassName} h-12 w-full px-5 text-base text-white bg-[var(--navy)] border-[var(--navy)]`}
                    >
                       Bắt đầu học </Link>
                  </div>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
