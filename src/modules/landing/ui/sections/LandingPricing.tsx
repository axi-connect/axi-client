import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { PricingPlans } from "@/modules/landing/ui/components/PricingPlans";
import { ModulePlans } from "@/modules/landing/ui/components/ModulePlans";
import type { PublicCatalog } from "@/modules/landing/domain/public-catalog";
import { LANDING_ANCHORS, PRICING } from "@/modules/landing/ui/content/landing.content";

/**
 * §9 Paquetes — la unidad es el volumen de conversaciones/mes, no las
 * funciones: un Paquete trae el producto completo y lo único que cambia es el
 * tramo. La prueba gratuita abre la escalera y el Programa Fundadores pone la
 * urgencia. Debajo, §9b Módulos (`ModulePlans`) vende una sola capacidad a
 * quien ya opera con otra herramienta.
 *
 * El catálogo lo carga la página en el servidor (una llamada por render, con
 * revalidación) y baja por props: `PricingPlans`, `ModulePlans` y el JSON-LD
 * leen la MISMA respuesta, así que no pueden contradecirse.
 */
export default function LandingPricing({ catalog }: { catalog: PublicCatalog | null }) {
  return (
    <>
      <section id={LANDING_ANCHORS.pricing} className="w-full scroll-mt-24">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-20 md:py-28">
          <Reveal>
            <SectionHeading
              kicker={PRICING.kicker}
              title={PRICING.title}
              intro={PRICING.intro}
              align="center"
              className="max-w-3xl"
            />
          </Reveal>

          <PricingPlans catalog={catalog} />

          <Reveal className="mt-6">
            <p className="text-muted-foreground mx-auto max-w-2xl text-center text-sm leading-relaxed">
              {PRICING.microcopy}
            </p>
          </Reveal>
        </div>
      </section>
      <ModulePlans catalog={catalog} />
    </>
  );
}
