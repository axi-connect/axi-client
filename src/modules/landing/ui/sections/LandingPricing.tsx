import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { PricingPlans } from "@/modules/landing/ui/components/PricingPlans";
import { LANDING_ANCHORS, PRICING } from "@/modules/landing/ui/content/landing.content";

/**
 * §9 Planes — la unidad es el volumen de conversaciones/mes, no las funciones:
 * el producto no cierra ninguna función por plan (`usage_plan` solo lleva
 * límites numéricos), así que SBS es una sola tarjeta cuyo precio escala con
 * el tramo de volumen. La prueba gratuita abre la escalera y el Programa
 * Fundadores pone la urgencia.
 *
 * Esta sección es RSC: toda la interacción vive en `PricingPlans`.
 */
export default function LandingPricing() {
  return (
    <section id={LANDING_ANCHORS.pricing} className="w-full scroll-mt-24">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-20 md:py-28">
        <Reveal>
          <SectionHeading
            title={PRICING.title}
            intro={PRICING.intro}
            align="center"
            className="max-w-3xl"
          />
        </Reveal>

        <PricingPlans />

        <Reveal className="mt-6">
          <p className="text-muted-foreground mx-auto max-w-2xl text-center text-sm leading-relaxed">
            {PRICING.microcopy}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
