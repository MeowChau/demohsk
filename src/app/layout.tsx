import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { NavigationProtectionProvider } from "@/components/shell/navigation-protection";
import "./globals.css";

const body = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});
const display = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://trike-hsk-web-tau.vercel.app"),
  title: { default: "TriceHSK — Học tiếng Trung mỗi ngày", template: "%s | TriceHSK" },
  description: "Học từ vựng tiếng Trung, luyện nghe, nói, đọc, viết và theo dõi mục tiêu HSK cùng TriceHSK.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body className="font-body antialiased">
        <ThemeProvider>
          <NavigationProtectionProvider>
          {children}
          <Toaster
            position="top-right"
            closeButton
            toastOptions={{
              classNames: {
                toast:
                  "!bg-surface dark:!bg-[var(--white)] !border !border-mist !text-ink !shadow-float !rounded-md",
                title: "!font-medium !text-sm",
                actionButton: "!bg-teal !text-white !rounded-pill !text-xs !font-semibold",
                cancelButton: "!bg-mist !text-slate !rounded-pill !text-xs !font-semibold",
              },
            }}
          />
          </NavigationProtectionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
