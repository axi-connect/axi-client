import { ChevronDown } from "lucide-react";

import type { PublicCatalog } from "@/modules/landing/domain/public-catalog";
import { PricingPlans } from "@/modules/landing/ui/components/PricingPlans";
import { FAQ, LANDING_ANCHORS } from "@/modules/landing/ui/content/landing.content";

/**
 * Después de la película: precios y preguntas. El escenario se asienta —sin
 * pin ni coreografía— porque aquí se compara y se lee.
 *
 * Los precios son los del catálogo público (ISR, D11) con el mismo componente
 * que `/precios`: un solo lugar decide cifras, tramos y descuentos.
 */
export function PricingScene({ catalog }: { catalog: PublicCatalog | null }) {
  return (
    <section id={LANDING_ANCHORS.pricing} data-scene="pricing" aria-labelledby="precios-h" className="relative w-full scroll-mt-24 overflow-clip">
      <div className="film-spot top-0 left-[calc(50%-520px)] size-[1040px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-brand)_8%,transparent),transparent)]" />
      <div className="relative z-[2] mx-auto w-full max-w-[1200px] px-4 py-24 sm:px-6">
        <div className="text-center">
          <h2 id="precios-h" className="film-h text-[clamp(34px,4.4vw,60px)]">
            Empieza gratis. <span className="t">Crece a tu ritmo.</span>
          </h2>
          <p className="film-lead mx-auto mt-4 max-w-2xl text-[clamp(15px,1.3vw,17px)]">
            Todos los paquetes traen el producto completo. Lo que cambia es cuántas conversaciones atiende Axi al mes.
          </p>
        </div>
        <PricingPlans catalog={catalog} />
      </div>
    </section>
  );
}

export function FaqScene() {
  return (
    <section id={LANDING_ANCHORS.faq} data-scene="faq" aria-labelledby="faq-h" className="relative w-full scroll-mt-24 overflow-clip">
      <div className="relative z-[2] mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
        <div>
          <h2 id="faq-h" className="film-h text-[clamp(34px,4vw,52px)]">
            Lo que nos <span className="t">preguntan.</span>
          </h2>
          <p className="film-lead mt-4 max-w-sm text-base">¿Tienes otra pregunta? Házsela a nuestro agente: atiende con Axi.</p>
        </div>
        {/* `<details>` nativo: abre y cierra sin JS, y el texto está en el HTML
            para los buscadores (el JSON-LD FAQPage lo emite la página). */}
        <div className="flex flex-col">
          {FAQ.items.map((item, i) => (
            <details key={item.q} className="group border-b border-[var(--film-line)] py-5" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[17px] font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="film-lead size-[18px] shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="film-lead mt-3 max-w-[40rem] text-[15px] leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
