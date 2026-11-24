import { Suspense, type ReactNode } from "react";
import { NavigationLink as Link } from "@/components/shell/navigation-protection";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { BrandLogo } from "@/components/ui/brand-logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* Top bar: logo + theme toggle */}
      <div className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link
          href="/"
          aria-label="Trang chủ TriceHSK"
          className="transition-opacity hover:opacity-80"
        >
          <div className="flex items-center gap-2 rounded-xl border-3 border-ink bg-white p-2.5 shadow-hard">
            <BrandLogo className="h-12 w-12" sizes="48px" priority />
            <span className="text-lg font-semibold text-ink">TriceHSK</span>
          </div>
        </Link>

        <ThemeToggle />
      </div>

      {/* Centered content */}
      <div className="flex flex-col items-center px-5 pb-20 pt-6 sm:px-8">
        <div className="w-full max-w-[440px]">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </div>
    </main>
  );
}
