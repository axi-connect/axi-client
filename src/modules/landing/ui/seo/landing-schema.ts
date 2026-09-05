import type { Offer, SoftwareApplication, WithContext } from "schema-dts";

import { siteUrl } from "@/core/config/env";
import { ORG_ID } from "@/core/seo/site";
import {
  modulePriceCop,
  planMonthlyCop,
  promotionLastDay,
  promotionOpen,
  type PublicCatalog,
} from "@/modules/landing/domain/public-catalog";
import { MODULES, PRICING, pricingPackages } from "@/modules/landing/ui/content/landing.content";

/**
 * `SoftwareApplication` con la oferta real de Axi Connect.
 *
 * Lee el MISMO catálogo que pintan las tarjetas (la página lo carga una vez y
 * lo pasa por props a ambos): no se copia ni un número. Si el JSON-LD
 * declarara un precio distinto del visible, Google lo trata como discrepancia
 * y puede retirar el resultado enriquecido. Sin catálogo, se declara solo la
 * prueba gratuita: ninguna cifra inventada.
 *
 * Qué NO se declara, a propósito:
 *  - El plan Enterprise no genera `Offer`: su piso no es un precio de lista.
 *  - Sin `aggregateRating`: no hay reseñas. Search Console lo marcará como
 *    "campo recomendado ausente"; es un aviso, no un error, y es preferible a
 *    inventar una valoración.
 */
export function pricingSchema(catalog: PublicCatalog | null, now: Date = new Date()): WithContext<SoftwareApplication> {
  const trialOffer: Offer = {
    "@type": "Offer",
    name: "Prueba gratuita de 7 días",
    price: "0",
    priceCurrency: "COP",
    url: siteUrl("/precios"),
    availability: "https://schema.org/InStock",
  };

  const packageOffers: Offer[] =
    catalog === null
      ? []
      : pricingPackages().flatMap((plan) => {
          /**
           * Con dos ejes un paquete no tiene UN precio sino una escalera. Se
           * declara el ESCALÓN DE ENTRADA —el tramo más bajo con cifra— y se
           * marca como mínimo con `priceSpecification`: es lo que Google
           * entiende de un rango.
           */
          const entry = catalog.volumes.find((volume) => volume.feeCop !== null) ?? catalog.volumes[0];
          const price = planMonthlyCop(catalog, plan.id, entry.id, now);
          if (price === null) return [];
          const open = promotionOpen(catalog, now) && catalog.promotion !== null;
          const lastDay = open && catalog.promotion ? promotionLastDay(catalog.promotion) : null;
          return [
            {
              "@type": "Offer",
              name: `Paquete ${plan.name}`,
              price: String(price),
              priceCurrency: "COP",
              priceSpecification: {
                "@type": "PriceSpecification",
                // `minPrice` es numérico en el vocabulario: mandarlo como texto
                // pasa el build y Google lo descarta sin decir nada.
                minPrice: price,
                priceCurrency: "COP",
                valueAddedTaxIncluded: false,
              },
              url: siteUrl("/precios"),
              availability: "https://schema.org/InStock",
              ...(lastDay ? { priceValidUntil: lastDay } : {}),
            } satisfies Offer,
          ];
        });

  const moduleOffers: Offer[] =
    catalog === null
      ? []
      : MODULES.flatMap((offer) => {
          const price = modulePriceCop(catalog, offer.offer_code);
          if (price === null) return [];
          return [
            {
              "@type": "Offer",
              name: `Módulo ${offer.name}`,
              price: String(price),
              priceCurrency: "COP",
              url: siteUrl("/precios"),
              availability: "https://schema.org/InStock",
            } satisfies Offer,
          ];
        });

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
