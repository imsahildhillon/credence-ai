import { EvidencePanel } from '@/components/landing/EvidencePanel';
import { HeroSection } from '@/components/landing/HeroSection';
import { InsightRows } from '@/components/landing/InsightRows';
import { ProblemStatement } from '@/components/landing/ProblemStatement';
import { RecruiterTeaser } from '@/components/landing/RecruiterTeaser';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteNav } from '@/components/landing/SiteNav';
import { WatchItThink } from '@/components/landing/WatchItThink';

/**
 * Landing — the first step of the journey (Landing → Continue with GitHub).
 * Public marketing surface; the actual GitHub sign-in lives on `/login`
 * (auth is out of scope for this feature). Page composition only — section
 * implementations live in `components/landing/*`.
 */
export default function LandingPage() {
  return (
    <>
      <SiteNav />
      <main>
        <HeroSection />
        <ProblemStatement />
        <InsightRows />
        <WatchItThink />
        <RecruiterTeaser />
        <EvidencePanel />
      </main>
      <SiteFooter />
    </>
  );
}
