import type { Offer, SoftwareApplication, WithContext } from "schema-dts";

import { siteUrl } from "@/core/config/env";
import { ORG_ID } from "@/core/seo/site";
import {
  FOUNDERS,
  PRICING,
  SBS_TIERS,
  founderCop,
  foundersRemaining,
  publishableModules,
} from "@/modules/landing/ui/content/landing.content";

/**
 * `SoftwareApplication` con la oferta real de Axi Connect.
 *
 * Vive en el slice de landing, y no en `core/seo/`, porque lee el contenido:
 * las cifras salen de `SBS_TIERS` y de `founderCop()`, **los mismos** que pintan
 * las tarjetas de precio. No se copia ni un número. Si el JSON-LD declarara un
 * precio distinto del visible, Google lo trata como discrepancia y puede
 * retirar el resultado enriquecido.
 *
 * Qué NO se declara, a propósito:
 *  - El plan Enterprise (`priceKind: "custom"`) no genera `Offer`: no tiene
 *    precio publicable y un `Offer` sin precio no aporta nada.
 *  - Los Módulos con `priceStatus: "draft"`: la tarjeta muestra la cifra como
 *    propuesta, pero afirmársela a Google sería publicar un precio no decidido.
 *    Entran solos al pasar a `final` (`publishableModules()`).
 *  - Sin `aggregateRating`: no hay reseñas. Search Console lo marcará como
 *    "campo recomendado ausente"; es un aviso, no un error, y es preferible a
 *    inventar una valoración.
 */
export function pricingSchema(): WithContext<SoftwareApplication> {
  // El precio de fundador es el que ve el visitante mientras queden cupos y no
  // haya vencido el programa; el JSON-LD tiene que decir lo mismo que la tarjeta.
  const foundersActive = foundersRemaining() > 0;
  const priceOf = (listCop: number) => (foundersActive ? founderCop(listCop) : listCop);

  const tierOffers: Offer[] = SBS_TIERS.map((tier) => ({
    "@type": "Offer",
    name: `Small Business Suite — ${tier.volumeBullet}`,
    price: String(priceOf(tier.listCop)),
    priceCurrency: "COP",
    url: siteUrl("/precios"),
    availability: "https://schema.org/InStock",
    ...(foundersActive ? { priceValidUntil: FOUNDERS.deadline } : {}),
  }));

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
    offers: [trialOffer, ...tierOffers, ...moduleOffers],
  };
}
