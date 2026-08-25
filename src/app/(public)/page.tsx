import type { Metadata } from "next";

import { siteUrl } from "@/core/config/env";
import { OG_IMAGE } from "@/core/seo/site";
import { JsonLd } from "@/core/seo/json-ld";
import { faqSchema, organizationSchema, webSiteSchema } from "@/core/seo/site";
import { FAQ } from "@/modules/landing/ui/content/landing.content";

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
const HOME_TITLE = "Axi Connect — El futuro es conversacional";
const HOME_DESCRIPTION =
  "Axi Connect pone a tu mejor vendedor en cada conversación: responde en segundos, cotiza con tus precios reales, arma el pedido y te muestra —en pesos— lo que produjo cada chat.";

/**
 * `title.absolute` y no un string suelto: el template del layout raíz
 * (`"%s — Axi Connect"`) se aplica a los títulos hijos, así que este mismo
 * texto renderizaba "Axi Connect — El futuro es conversacional — Axi Connect".
 */
export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Axi Connect",
    locale: "es_CO",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: siteUrl("/"),
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

export default function Home() {
  return (
    <div className="w-full">
      {/* La identidad de la marca se declara una sola vez, en la home. El
          FAQPage es indispensable aquí: el acordeón desmonta las respuestas
          cerradas, así que este bloque es la única vía por la que ese copy
          llega a Google. */}
      <JsonLd data={organizationSchema()} />
      <JsonLd data={webSiteSchema()} />
      <JsonLd data={faqSchema(FAQ.items)} />
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
