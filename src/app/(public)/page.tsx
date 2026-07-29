import type { Metadata } from "next";

import LandingHero from "@/modules/landing/ui/sections/LandingHero";
import LandingSocialProof from "@/modules/landing/ui/sections/LandingSocialProof";
import LandingProblem from "@/modules/landing/ui/sections/LandingProblem";
import LandingHowItWorks from "@/modules/landing/ui/sections/LandingHowItWorks";
import LandingAiGuardrails from "@/modules/landing/ui/sections/LandingAiGuardrails";
import LandingMetrics from "@/modules/landing/ui/sections/LandingMetrics";
import LandingTeamControl from "@/modules/landing/ui/sections/LandingTeamControl";
import LandingCases from "@/modules/landing/ui/sections/LandingCases";
import LandingPricing from "@/modules/landing/ui/sections/LandingPricing";
import LandingFaq from "@/modules/landing/ui/sections/LandingFaq";
import LandingTerminal from "@/modules/landing/ui/sections/LandingTerminal";
import LandingFinalCta from "@/modules/landing/ui/sections/LandingFinalCta";

/**
 * Landing de conversión de Axi Connect.
 * Estructura y copy: `axi/docs/business/landing-copy.md`.
 * La versión anterior quedó como backup en
 * `shared/components/layout/site/legacy/LegacyLandingPage.tsx`.
 */
export const metadata: Metadata = {
  title: "Axi Connect — El futuro es conversacional",
  description:
    "Axi Connect pone a tu mejor vendedor en cada conversación: responde en segundos, cotiza con tus precios reales, arma el pedido y te muestra —en pesos— lo que produjo cada chat.",
};

export default function Home() {
  return (
    <div className="w-full">
      <LandingHero />
      <LandingSocialProof />
      <LandingProblem />
      <LandingHowItWorks />
      <LandingAiGuardrails />
      <LandingMetrics />
      <LandingTeamControl />
      <LandingCases />
      <LandingPricing />
      <LandingFaq />
      <LandingTerminal />
      <LandingFinalCta />
    </div>
  );
}
