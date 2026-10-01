import "../film-tanda4.css";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { salesWhatsAppUrl } from "@/core/config/env";
import { FILM_FAQ, FILM_PRICING } from "@/modules/landing/domain/film/tanda4-content";
import type { PublicCatalog } from "@/modules/landing/domain/public-catalog";
import { FilmPricing } from "@/modules/landing/ui/film/parts/FilmPricing";
import { FAQ, LANDING_ANCHORS } from "@/modules/landing/ui/content/landing.content";

/**
 * Después de la película: precios y preguntas (plan §16.2 y §16.3). El
 * escenario se asienta —sin pin ni scrub— porque aquí se compara y se lee.
 *
 * Los precios son los del catálogo público (ISR, D11) con la misma lógica que
 * `/precios` (`pricing-state.ts`), en su piel de tinta: un solo lugar decide
 * cifras, tramos y descuentos. La entrada (una vez, al llegar) la pone el
 * motor; sin motor todo está en su sitio.
 */
export function PricingScene({ catalog }: { catalog: PublicCatalog | null }) {
  return (
    <section id={LANDING_ANCHORS.pricing} data-scene="pricing" aria-labelledby="precios-h" className="film-price relative w-full scroll-mt-24 overflow-clip">
      <div className="film-price-spot" aria-hidden="true" />
      <div className="relative z-[2] mx-auto w-full max-w-[1200px] px-4 py-24 sm:px-6">
        <div data-anim="price-head" className="text-center">
          <p className="film-eyebrow film-dim mb-[18px]">{FILM_PRICING.eyebrow}</p>
          <h2 id="precios-h" className="film-h text-[clamp(38px,4.6vw,64px)]">
            {FILM_PRICING.title} <span className="t">{FILM_PRICING.titleThin}</span>
          </h2>
          <p className="film-lead mx-auto mt-[18px] max-w-[600px] text-[clamp(15px,1.3vw,17px)] leading-relaxed">{FILM_PRICING.lead}</p>
        </div>
        {catalog ? <FilmPricing catalog={catalog} /> : <PricingUnavailable />}
      </div>
    </section>
  );
}

/**
 * Sin catálogo no hay cifra que dar: se ofrece la conversación (el mismo
 * mensaje que `/precios`). Sin JS: no hay nada que elegir.
 */
function PricingUnavailable() {
  return (
    <div data-testid="pricing-unavailable" className="film-price-ent mx-auto mt-12 max-w-[720px] flex-col !items-center text-center">
      <p className="film-eyebrow film-dim">Precios a consulta</p>
      <p className="film-h text-2xl">Estamos actualizando el catálogo. Te lo enviamos hoy mismo.</p>
      <p className="film-lead text-sm leading-relaxed">
        Los precios se publican desde nuestro catálogo en vivo y ahora mismo no está disponible. Escríbenos y te mandamos el plan
        y el tramo que le queda a tu negocio.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link prefetch={false} href="/contacto" className="film-faq-cta">
          Hablar con ventas
        </Link>
        <a
          className="film-price-ent-cta inline-flex items-center gap-2"
          href={salesWhatsAppUrl("Hola, quiero conocer los planes de Axi Connect.")}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle aria-hidden="true" className="size-4" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}

/**
 * Preguntas: `<details>` nativo, así abre y cierra sin JS y el texto está en el
 * HTML para los buscadores (el JSON-LD FAQPage lo emite la página). Los textos
 * son los de `FAQ`; la primera va abierta.
 */
export function FaqScene() {
  return (
    <section id={LANDING_ANCHORS.faq} data-scene="faq" aria-labelledby="faq-h" className="relative w-full scroll-mt-24 overflow-clip">
      <div className="film-faq relative z-[2] mx-auto w-full max-w-[1200px] px-4 py-24 sm:px-6">
        <div className="film-faq-side">
          <p className="film-eyebrow film-dim">{FILM_FAQ.eyebrow}</p>
          <h2 id="faq-h" className="film-h text-[clamp(36px,4vw,56px)]">
            {FILM_FAQ.title}
            <br />
            <span className="t">{FILM_FAQ.titleThin}</span>
          </h2>
          <p className="film-lead text-base leading-relaxed">{FILM_FAQ.lead}</p>
          <a className="film-faq-cta" href={salesWhatsAppUrl(FILM_FAQ.whatsappMessage)} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden="true" className="size-[17px]" strokeWidth={2} />
            {FILM_FAQ.cta}
          </a>
          <p className="film-faq-live">
            <span className="film-faq-live-dot" aria-hidden="true" />
            {FILM_FAQ.live}
          </p>
        </div>
        <div className="film-faq-list">
          {FAQ.items.map((item, i) => (
            <details key={item.q} className="film-faq-item" open={i === 0}>
              <summary>
                <span className="film-faq-n">{String(i + 1).padStart(2, "0")}</span>
                <span className="film-faq-q">{item.q}</span>
                <span className="film-faq-sign" aria-hidden="true" />
              </summary>
              <p className="film-faq-a">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
