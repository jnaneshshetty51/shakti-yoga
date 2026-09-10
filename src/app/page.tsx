import Hero from "@/components/Hero";
import TargetAudience from "@/components/TargetAudience";

// Pricing is per-visitor (₹ for India, $ for everyone else — resolved from the
// region cookie in <Programs>/<YogaTherapy>), so the homepage renders per request.
export const dynamic = "force-dynamic";

import Programs from "@/components/Programs";
import WhyUs from "@/components/WhyUs";
import Founder from "@/components/Founder";
import ShaktiDifference from "@/components/ShaktiDifference";
import HowItWorks from "@/components/HowItWorks";
import YogaTherapy from "@/components/YogaTherapy";
import FreeTrial from "@/components/FreeTrial";
import Stories from "@/components/Stories";
import TakeAMoment from "@/components/TakeAMoment";
import WorkshopsRetreats from "@/components/WorkshopsRetreats";
import ForOrganizations from "@/components/ForOrganizations";
import FAQ from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";

export default function Home() {
  return (
    <main className="flex flex-col w-full">
      <Hero />
      <TargetAudience />
      <Programs />
      <WhyUs />
      <Founder />
      <ShaktiDifference />
      <HowItWorks />
      <YogaTherapy />
      <FreeTrial />
      <Stories />
      <TakeAMoment />
      <WorkshopsRetreats />
      <ForOrganizations />
      <FAQ />
      <FinalCTA />
    </main>
  );
}
