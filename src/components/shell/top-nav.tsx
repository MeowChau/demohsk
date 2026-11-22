"use client";

import { LandingNav } from "@/components/landing/landing-nav";

export type NavRole = "student" | "teacher" | "admin";

export function TopNav({
  role,
  displayName,
  avatarUrl,
}: {
  role: NavRole;
  displayName: string;
  avatarUrl?: string | null;
}) {
  return <LandingNav authenticated variant="app" role={role} displayName={displayName} avatarUrl={avatarUrl} />;
}
