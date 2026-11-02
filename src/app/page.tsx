import { getLegacyUser } from "@/lib/api/server"
import { apiRole, publicMedia } from "@/lib/api/config"
import { LandingNav } from "@/components/landing/landing-nav"
import { Hero } from "@/components/landing/hero"
import { TrustBar } from "@/components/landing/trust-bar"
import { HowItWorks } from "@/components/landing/how-it-works"
import { FeatureShowcase } from "@/components/landing/feature-showcase"
import { ForTeachers } from "@/components/landing/for-teachers"
import { SocialProof } from "@/components/landing/social-proof"
import { PricingSection } from "@/components/landing/pricing-section"
import { FAQSection } from "@/components/landing/faq-section"
import { ClosingCTA } from "@/components/landing/closing-cta"
import { LandingFooter } from "@/components/landing/landing-footer"
import { ScrollToTop } from "@/components/landing/scroll-to-top"
import type { NavRole } from "@/components/shell/top-nav"

export default async function LandingPage() {
  const user = await getLegacyUser().catch(() => null)
  const displayName = user ? user.fullName || [user.firstName,user.lastName].filter(Boolean).join(" ") || user.username : ""
  const role: NavRole = user ? apiRole(user) : "student"
  const avatarUrl = publicMedia(user?.photo?.path)

  return (
    <main className="min-h-screen">
      <LandingNav user={user} displayName={displayName} role={role} avatarUrl={avatarUrl} />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <FeatureShowcase />
      <ForTeachers />
      <SocialProof />
      <PricingSection />
      <FAQSection />
      <ClosingCTA />
      <LandingFooter />
      <ScrollToTop />
    </main>
  )
}
