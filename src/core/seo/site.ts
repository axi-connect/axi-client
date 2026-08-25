import type {
  BreadcrumbList,
  ContactPage,
  FAQPage,
  Organization,
  WebSite,
  WithContext,
} from "schema-dts";

import { SALES_WHATSAPP, SITE_URL, siteUrl } from "@/core/config/env";
import { routeLabel } from "@/core/seo/routes";

/**
 * Identidad del sitio para datos estructurados.
 *
 * REGLA QUE NO SE NEGOCIA: aquí solo entran hechos verificables. Un JSON-LD que
 * afirma algo que la página no muestra —o que no es cierto— es motivo de acción
 * manual en Search Console, y el beneficio de inventar una reseña o un perfil
 * social no compensa perder los resultados enriquecidos del sitio entero.
 * Por eso faltan a propósito `sameAs` (axi no tiene aún perfiles propios: los
 * del pie son de Kodecol), `aggregateRating` (no hay reseñas) y `SearchAction`
 * (no hay buscador).
 */
/**
 * Imagen de las tarjetas de enlace (1200×630, `src/app/opengraph-image.png`).
 *
 * Se declara explícitamente en cada página en vez de confiar en la convención
 * de archivo de Next: en cuanto una página define su propio `openGraph`, la
 * imagen heredada del layout raíz deja de emitirse, y el resultado es un
 * `og:image` ausente — una tarjeta de enlace sin imagen en WhatsApp, LinkedIn
 * y X, que es justo lo que se quería arreglar.
 */
export const OG_IMAGE = {
  url: siteUrl("/opengraph-image.png"),
  width: 1200,
  height: 630,
  alt: "Axi Connect — atención y ventas por WhatsApp con agentes de IA",
} as const;

export const SITE = {
  name: "Axi Connect",
  url: SITE_URL,
  logo: siteUrl("/images/brand/logo-horizontal.png"),
  description:
    "Atención al cliente omnicanal con IA: WhatsApp, Instagram y Messenger en un solo inbox, con agentes inteligentes y handoff humano.",
} as const;

/**
 * `@id` estables para que los distintos bloques del sitio se refieran a la
 * misma entidad en vez de declarar organizaciones duplicadas.
 */
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export function organizationSchema(): WithContext<Organization> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE.name,
    url: siteUrl("/"),
    description: SITE.description,
    logo: {
      "@type": "ImageObject",
      url: SITE.logo,
    },
    areaServed: { "@type": "Country", name: "Colombia" },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        // El número sale de `core/config/env.ts`: es el único punto que lo
        // define (docs/architecture.md §13.1). Aquí solo se le añade el '+'.
        telephone: `+${SALES_WHATSAPP}`,
        availableLanguage: ["es"],
      },
    ],
  };
}

export function webSiteSchema(): WithContext<WebSite> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE.name,
    url: siteUrl("/"),
    description: SITE.description,
    inLanguage: "es-CO",
    publisher: { "@id": ORG_ID },
  };
}

/**
 * `FAQPage` a partir de los pares pregunta/respuesta del contenido.
 *
 * Es la pieza de más valor del sitio: el acordeón de Radix DESMONTA el cuerpo
 * de los items cerrados, así que esas respuestas no existen en el HTML inicial.
 * Sin este bloque, el copy que responde las objeciones de compra no llega a
 * Google por ninguna vía.
 */
export function faqSchema(items: readonly { q: string; a: string }[]): WithContext<FAQPage> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question" as const,
      name: item.q,
      acceptedAnswer: { "@type": "Answer" as const, text: item.a },
    })),
  };
}

/**
 * Migas de pan. El primer nivel es siempre la home; se le pasan los paths de
 * los descendientes y toma la etiqueta del inventario de rutas indexables.
 */
export function breadcrumbSchema(paths: readonly string[]): WithContext<BreadcrumbList> {
  const trail = ["/", ...paths];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((path, index) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name: routeLabel(path) ?? path,
      item: siteUrl(path),
    })),
  };
}

export function contactPageSchema(): WithContext<ContactPage> {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Agenda tu demo de Axi Connect",
    url: siteUrl("/contacto"),
    inLanguage: "es-CO",
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
  };
}
