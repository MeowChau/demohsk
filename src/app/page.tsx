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
import { getCatalogOverview } from "@/lib/api/catalog"
import { userDisplayName } from "@/lib/user-display"

export default async function LandingPage() {
  const [user, catalog] = await Promise.all([getLegacyUser().catch(() => null), getCatalogOverview()])
  const displayName = user ? userDisplayName(user) : ""
  const role: NavRole = user ? apiRole(user) : "student"
  const avatarUrl = publicMedia(user?.photo?.path)

  return (
    <main className="min-h-screen">
      <LandingNav user={user} displayName={displayName} role={role} avatarUrl={avatarUrl} />
      <Hero catalog={catalog} />
      <TrustBar stats={[
        { label: "Từ vựng", value: catalog.words },
        { label: "Bộ luyện tập", value: catalog.practices },
        { label: "Đề thi", value: catalog.exams },
        { label: "Chủ đề bài học", value: catalog.topics.length || (catalog.available ? 0 : null) },
      ]} />
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
