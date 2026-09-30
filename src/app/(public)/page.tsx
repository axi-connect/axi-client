import type { Metadata } from "next";

import { siteUrl } from "@/core/config/env";
import { OG_IMAGE } from "@/core/seo/site";
import { JsonLd } from "@/core/seo/json-ld";
import { faqSchema, organizationSchema, webSiteSchema } from "@/core/seo/site";
import { FAQ } from "@/modules/landing/ui/content/landing.content";
import { loadPublicCatalog } from "@/modules/landing/infrastructure/pricing-catalog.loader";

import { FilmPage } from "@/modules/landing/ui/film/FilmPage";

/**
 * La home de Axi Connect: una película por scroll (programa «Landing
 * cinematográfica», `docs/plans/landing_cinematica_plan.md`). La home anterior
 * quedó archivada en el tag git `landing-v1-archive`.
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

/**
 * ISR: el catálogo de precios se lee del API público una vez por render y la
 * página se revalida cada minuto (D11). Un fallo del API no rompe el build ni
 * la página: `loadPublicCatalog()` devuelve `null` y la sección de precios
 * pinta «precios a consulta» hasta la siguiente revalidación.
 */
// Literal a propósito: Next exige que la config de segmento sea analizable
// estáticamente (una constante importada rompe el build). Debe coincidir con
// `CATALOG_REVALIDATE_SECONDS` del loader; un spec guardián lo vigila.
export const revalidate = 60;

export default async function Home() {
  const catalog = await loadPublicCatalog();
  return (
    <div className="w-full">
      {/* La identidad de la marca se declara una sola vez, en la home. El
          FAQPage es indispensable aquí: el acordeón desmonta las respuestas
          cerradas, así que este bloque es la única vía por la que ese copy
          llega a Google. */}
      <JsonLd data={organizationSchema()} />
      <JsonLd data={webSiteSchema()} />
      <JsonLd data={faqSchema(FAQ.items)} />
      <FilmPage catalog={catalog} />
    </div>
  );
}
