import { AppShell } from "@/components/shell/app-shell";
import { requireOnboarding } from "@/lib/auth/require-onboarding";

export const metadata = { robots: { index: false, follow: false } };

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboarding();

  return <AppShell role="student">{children}</AppShell>;
}
