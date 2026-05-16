import DirectorsCatalog from "@/components/landing/DirectorsCatalog";
import FinalCTA from "@/components/landing/FinalCTA";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Pricing from "@/components/landing/Pricing";
import ProofGallery from "@/components/landing/ProofGallery";
import RiskReversal from "@/components/landing/RiskReversal";
import TrustAndFaq from "@/components/landing/TrustAndFaq";

/**
 * Section order follows Docs/landing-spec.md §6 HARD DECISIONS:
 * Hero → Proof Gallery (before/after) → … — not “How it works” first.
 */
export default function MarketingHomePage() {
  return (
    <>
      <Hero />
      <ProofGallery />
      <RiskReversal />
      <HowItWorks />
      <DirectorsCatalog />
      <Pricing />
      <TrustAndFaq />
      <FinalCTA />
    </>
  );
}
