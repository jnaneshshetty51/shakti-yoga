import Hero from "@/components/Hero";
import TargetAudience from "@/components/TargetAudience";

// Pricing is per-visitor (₹ for India, $ for everyone else — resolved from the
// region cookie in <Programs>/<YogaTherapy>), so the homepage renders per request.
export const dynamic = "force-dynamic";

import Programs from "@/components/Programs";
import HowItWorks from "@/components/HowItWorks";
import FreeTrial from "@/components/FreeTrial";
import YogaTherapy from "@/components/YogaTherapy";
import Stories from "@/components/Stories";
import WhyUs from "@/components/WhyUs";
import FAQ from "@/components/FAQ";

export default function Home() {
  return (
    <main className="flex flex-col w-full">
      <Hero />
      <TargetAudience />
      <Programs />
      <HowItWorks />
      <FreeTrial />
      <YogaTherapy />
      <Stories />
      <WhyUs />
      <FAQ />
    </main>
  );
}
