import type { Metadata } from "next";

import { pageMetadata } from "@/core/seo/metadata";
import { JsonLd } from "@/core/seo/json-ld";
import { breadcrumbSchema } from "@/core/seo/site";

import ProductosHero from "@/modules/landing/ui/sections/productos/ProductosHero";
import ProductosAgentReveal from "@/modules/landing/ui/sections/productos/ProductosAgentReveal";
import ProductosCarousel from "@/modules/landing/ui/sections/productos/ProductosCarousel";
import ProductosInbox from "@/modules/landing/ui/sections/productos/ProductosInbox";
import ProductosCrmBento from "@/modules/landing/ui/sections/productos/ProductosCrmBento";
import ProductosCatalogo from "@/modules/landing/ui/sections/productos/ProductosCatalogo";
import ProductosConversaciones from "@/modules/landing/ui/sections/productos/ProductosConversaciones";
import ProductosFinalCta from "@/modules/landing/ui/sections/productos/ProductosFinalCta";

/**
 * `/productos` — F6 del plan GTM: la página más rica de la capa pública.
 * Hero con video en streaming, escena pineada del agente, carrusel de
 * capacidades, capturas reales en device frames, bento del CRM y medición.
 *
 * Plan de fase: `docs/plans/public-gtm-f6-productos.md`.
 *
 * Las anclas `#agente #inbox #crm #catalogo` están enlazadas desde el
 * mega-menú y el footer: si se renombra una, hay que actualizar
 * `site-nav.content.ts` en el mismo commit. `#medicion` ya no vive aquí:
 * duplicaba la §6 de la home y su entrada del nav apunta a `/#medicion`.
 *
 * La raíz es `w-full` (el `<main>` del layout centra con `items-center`) y
 * NINGÚN wrapper de página lleva overflow: el pin de `#agente` depende de que
 * el sticky alcance al scroller `[data-app-scroll]`.
 */
export const metadata: Metadata = pageMetadata({
  title: "Productos",
  description:
    "El agente vendedor, el inbox con handoff, el CRM, el catálogo con stock real, la agenda y la medición en pesos. Producto construido y en producción, no roadmap.",
  path: "/productos",
});

export default function ProductosPage() {
  return (
    <div className="w-full">
      <JsonLd data={breadcrumbSchema(["/productos"])} />
      <ProductosHero />
      <ProductosAgentReveal />
      <ProductosCarousel />
      <ProductosInbox />
      <ProductosCrmBento />
      <ProductosCatalogo />
      <ProductosConversaciones />
      <ProductosFinalCta />
    </div>
  );
}
