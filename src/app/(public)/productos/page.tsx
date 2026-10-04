import type { Metadata } from "next";

import "@/modules/landing/ui/sections/productos/productos.css";
import { pageMetadata } from "@/core/seo/metadata";
import { JsonLd } from "@/core/seo/json-ld";
import { breadcrumbSchema } from "@/core/seo/site";

import { PRODUCTOS_ANCHORS, PRODUCTOS_SEO } from "@/modules/landing/ui/content/productos.content";
import { ProductosOpening } from "@/modules/landing/ui/sections/productos/ProductosOpening";
import { ProductosGame } from "@/modules/landing/ui/sections/productos/game/ProductosGame";
import { ProductosPieces } from "@/modules/landing/ui/sections/productos/pieces/ProductosPieces";
import { ProductosVideoScene } from "@/modules/landing/ui/sections/productos/ProductosVideoScene";
import { ProductosWall } from "@/modules/landing/ui/sections/productos/ProductosWall";
import { ProductosClose } from "@/modules/landing/ui/sections/productos/ProductosClose";
import { ProductosHashRouter } from "@/modules/landing/ui/sections/productos/ProductosHashRouter";

/**
 * `/productos` — «Escríbele. Mira cómo vende.» (plan
 * `docs/plans/productos_juego_plan.md`, lienzo aprobado el 2026-10-03).
 *
 * Seis escenas: apertura, el juego (#agente), pieza por pieza (#piezas, con
 * una pestaña por ancla), el video del fundador (#video), el muro «Así suena
 * un negocio con Axi» (#conversaciones) y el cierre (#empezar). Los enlaces del menú caen en su pieza exacta vía
 * `ProductosHashRouter`; `productos-anchors.test.tsx` vigila que existan.
 *
 * Ningún wrapper lleva overflow-y: las escenas fijas dependen de que el sticky
 * alcance al scroller `[data-app-scroll]`.
 */
export const metadata: Metadata = pageMetadata({
  title: PRODUCTOS_SEO.title,
  description: PRODUCTOS_SEO.description,
  path: "/productos",
});

export default function ProductosPage() {
  return (
    <div className="pj">
      <JsonLd data={breadcrumbSchema(["/productos"])} />
      {/* Hero y juego bajo una sola luz: el teléfono viaja de uno a otro. */}
      <div className="pj-stage">
        <div className="pj-stage-light" aria-hidden="true" />
        <ProductosOpening />
        <ProductosGame />
      </div>
      <section id={PRODUCTOS_ANCHORS.pieces} aria-labelledby="piezas-title" className="pj-scene pj-pieces">
        <ProductosPieces />
      </section>
      <ProductosVideoScene />
      <ProductosWall />
      <ProductosClose />
      <ProductosHashRouter />
    </div>
  );
}
