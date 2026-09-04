import type { Offer, SoftwareApplication, WithContext } from "schema-dts";

import { siteUrl } from "@/core/config/env";
import { ORG_ID } from "@/core/seo/site";
import {
  FOUNDERS,
  PRICING,
  PRICING_VOLUMES,
  foundersOfferOpen,
  planMonthlyCop,
  pricingPackages,
  publishableModules,
} from "@/modules/landing/ui/content/landing.content";

/**
 * `SoftwareApplication` con la oferta real de Axi Connect.
 *
 * Vive en el slice de landing, y no en `core/seo/`, porque lee el contenido:
 * las cifras salen de `PRICING.plans` y de `founderCop()`, **los mismos** que
 * pintan las tarjetas de precio. No se copia ni un número. Si el JSON-LD declarara un
 * precio distinto del visible, Google lo trata como discrepancia y puede
 * retirar el resultado enriquecido.
 *
 * Qué NO se declara, a propósito:
 *  - El plan Enterprise no genera `Offer`: no tiene precio publicable y un
 *    `Offer` sin precio no aporta nada.
 *  - Los Módulos con `priceStatus: "draft"`: la tarjeta muestra la cifra como
 *    propuesta, pero afirmársela a Google sería publicar un precio no decidido.
 *    Entran solos al pasar a `final` (`publishableModules()`).
 *  - Sin `aggregateRating`: no hay reseñas. Search Console lo marcará como
 *    "campo recomendado ausente"; es un aviso, no un error, y es preferible a
 *    inventar una valoración.
 */
export function pricingSchema(): WithContext<SoftwareApplication> {
  // Cupos Y fecha, por la MISMA puerta que usan las tarjetas. Antes esta línea
  // miraba solo los cupos, así que pasada la fecha el buscador habría seguido
  // anunciando el precio de fundador con una validez ya vencida mientras la
  // página mostraba el de lista.
  const foundersActive = foundersOfferOpen();

  /**
   * Desde que el precio tiene dos ejes, un paquete no tiene UN precio sino una
   * escalera. Se declara el ESCALÓN DE ENTRADA —el volumen más bajo del
   * catálogo— y se marca como mínimo con `priceSpecification`: es lo que Google
   * entiende de un rango, y afirmar un precio fijo que la página no muestra en
   * todos sus tramos sería la discrepancia que retira el resultado enriquecido.
   */
  const entryVolume = PRICING_VOLUMES[0];

  const packageOffers: Offer[] = pricingPackages().flatMap((plan) => {
    const price = planMonthlyCop(plan, entryVolume.id);
    if (price === null) return [];
    return [
      {
        "@type": "Offer",
        name: `Paquete ${plan.name}`,
        price: String(price),
        priceCurrency: "COP",
        priceSpecification: {
          "@type": "PriceSpecification",
          // `minPrice` es numérico en el vocabulario: mandarlo como texto pasa
          // el build y Google lo descarta sin decir nada.
          minPrice: price,
          priceCurrency: "COP",
          valueAddedTaxIncluded: false,
        },
        url: siteUrl("/precios"),
        availability: "https://schema.org/InStock",
        ...(foundersActive ? { priceValidUntil: FOUNDERS.deadline } : {}),
      } satisfies Offer,
    ];
  });

  const trialOffer: Offer = {
    "@type": "Offer",
    name: "Prueba gratuita de 7 días",
    price: "0",
    priceCurrency: "COP",
    url: siteUrl("/precios"),
    availability: "https://schema.org/InStock",
  };

  const moduleOffers: Offer[] = publishableModules().map((offer) => ({
    "@type": "Offer",
    name: `Módulo ${offer.name}`,
    price: String(offer.listCop),
    priceCurrency: "COP",
    url: siteUrl("/precios"),
    availability: "https://schema.org/InStock",
  }));

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Axi Connect",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteUrl("/precios"),
    description: PRICING.intro,
    inLanguage: "es-CO",
    publisher: { "@id": ORG_ID },
    offers: [trialOffer, ...packageOffers, ...moduleOffers],
  };
}
