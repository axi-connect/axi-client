import type { Metadata } from "next";

import "@/modules/landing/ui/sections/productos/productos.css";
import { pageMetadata } from "@/core/seo/metadata";
import { JsonLd } from "@/core/seo/json-ld";
import { breadcrumbSchema } from "@/core/seo/site";
import { pricingSchema } from "@/modules/landing/ui/seo/landing-schema";

import { PRODUCTOS_ANCHORS, PRODUCTOS_SEO } from "@/modules/landing/ui/content/productos.content";
import { ProductosOpening } from "@/modules/landing/ui/sections/productos/ProductosOpening";
import { ProductosGame } from "@/modules/landing/ui/sections/productos/game/ProductosGame";
import { ProductosPieces } from "@/modules/landing/ui/sections/productos/pieces/ProductosPieces";
import { ProductosVideoScene } from "@/modules/landing/ui/sections/productos/ProductosVideoScene";
import { ProductosWall } from "@/modules/landing/ui/sections/productos/ProductosWall";
import { ProductosClose } from "@/modules/landing/ui/sections/productos/ProductosClose";
import { ProductosControl } from "@/modules/landing/ui/sections/productos/ProductosControl";
import { ProductosPrice } from "@/modules/landing/ui/sections/productos/ProductosPrice";
import { ProductosRecover } from "@/modules/landing/ui/sections/productos/ProductosRecover";
import { loadPublicCatalog } from "@/modules/landing/infrastructure/pricing-catalog.loader";
import { ProductosHashRouter } from "@/modules/landing/ui/sections/productos/ProductosHashRouter";

/**
 * `/productos` — «Escríbele. Mira cómo vende.» en tinta (plan
 * `docs/plans/productos_tinta_plan.md`, lienzo aprobado el 2026-10-06; parte de
 * `productos_juego_plan.md`).
 *
 * Nueve escenas: apertura, el juego (#agente), lo que no cerraste hoy
 * (#recuperar), pieza por pieza (#piezas, una pestaña por ancla), el video del
 * fundador (#video), el muro (#conversaciones), lo que cuesta (#precio), vende
 * solo, nunca sin ti (#control) y el cierre (#empezar). Los enlaces del menú
 * caen en su pieza exacta vía `ProductosHashRouter`; `productos-anchors.test.tsx`
 * vigila que existan.
 *
 * El precio de Esencial sale del catálogo público, como en `/` y `/precios`:
 * si cambia en /platform, cambia aquí en la siguiente revalidación.
 *
 * Ningún wrapper lleva overflow-y: las escenas fijas dependen de que el sticky
 * alcance al scroller `[data-app-scroll]`.
 */
/** Literal (no la constante importada): Next la exige estática. Vigilado por catalog-revalidate.test. */
export const revalidate = 60;

export const metadata: Metadata = pageMetadata({
  title: PRODUCTOS_SEO.title,
  description: PRODUCTOS_SEO.description,
  path: "/productos",
});

export default async function ProductosPage() {
  const catalog = await loadPublicCatalog();
  return (
    <div className="pj">
      <JsonLd data={breadcrumbSchema(["/productos"])} />
      {/* El producto y sus ofertas con el precio vivo del catálogo, como en /precios. */}
      <JsonLd data={pricingSchema(catalog)} />
      {/* Hero y juego bajo una sola luz: el teléfono viaja de uno a otro. */}
      <div className="pj-stage">
        <div className="pj-stage-light" aria-hidden="true" />
        <ProductosOpening />
        <ProductosGame />
      </div>
      <ProductosRecover />
      <section id={PRODUCTOS_ANCHORS.pieces} aria-labelledby="piezas-title" className="pj-scene pj-pieces">
        <ProductosPieces />
      </section>
      <ProductosVideoScene />
      <ProductosWall />
      <ProductosPrice catalog={catalog} now={new Date()} />
      <ProductosControl />
      <ProductosClose />
      <ProductosHashRouter />
    </div>
  );
}
