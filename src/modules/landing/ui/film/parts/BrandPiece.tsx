import { useId, type CSSProperties } from "react";

import { cn } from "@/core/lib/utils";
import { BRAND_RIBBONS } from "@/shared/components/ui/brand-mark";

/**
 * Una cinta del isotipo como pieza (plan §18.2, «Vendemos progreso»).
 *
 * Reglas de la dueña: el path EXACTO de `BRAND_RIBBONS` (no se duplica), escala
 * uniforme (alto dado, ancho por la proporción del viewBox) y nunca rotada,
 * inclinada ni deformada. Material estático: el degradado de marca, una segunda
 * capa con la misma forma y un degradado blanco vertical (brillo arriba) y un
 * filete blanco de 1 px. Sin `filter`.
 *
 * `frame="tight"` encuadra la cinta sola; `frame="mark"` usa el encuadre del
 * isotipo armado, igual en las tres, para que encajen exactas al superponerse.
 */

export type RibbonName = (typeof BRAND_RIBBONS)[number]["name"];

/** Encuadres ceñidos de cada cinta y el del isotipo armado (coordenadas del logo, 500 × 500). */
const TIGHT: Record<RibbonName, readonly [number, number, number, number]> = {
  coral: [84, 121, 280, 260],
  violet: [155, 121, 260, 258],
  amber: [160, 115, 256, 266],
};
const MARK = [90, 115, 330, 270] as const;

export function pieceBox(rib: RibbonName, height: number, frame: "tight" | "mark" = "tight") {
  const vb = frame === "mark" ? MARK : TIGHT[rib];
  return { vb, width: Math.round((height * vb[2]) / vb[3]), height };
}

export function BrandPiece({
  rib,
  height,
  frame = "tight",
  className,
  style,
}: {
  rib: RibbonName;
  height: number;
  frame?: "tight" | "mark";
  className?: string;
  style?: CSSProperties;
}) {
  const id = useId();
  const r = BRAND_RIBBONS.find((x) => x.name === rib)!;
  const { vb, width } = pieceBox(rib, height, frame);
  const rule = r.evenOdd ? "evenodd" : undefined;
  const brand = `${id}-b`;
  const sheen = `${id}-s`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={vb.join(" ")}
      aria-hidden="true"
      className={cn("block overflow-visible", className)}
      style={style}
      data-piece={rib}
    >
      <defs>
        <linearGradient id={brand} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} gradientUnits="userSpaceOnUse">
          <stop stopColor={r.from} />
          <stop offset="1" stopColor={r.to} />
        </linearGradient>
        {/* El brillo: blanco al 34 % arriba de la caja, 6 % al 45 % y nada al 60 %. */}
        <linearGradient id={sheen} x1="0" y1={vb[1]} x2="0" y2={vb[1] + vb[3]} gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity={0.34} />
          <stop offset="0.45" stopColor="#fff" stopOpacity={0.06} />
          <stop offset="0.6" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={r.d} fill={`url(#${brand})`} fillRule={rule} clipRule={rule} />
      <path d={r.d} fill={`url(#${sheen})`} fillRule={rule} clipRule={rule} />
      <path d={r.d} fill="none" fillRule={rule} stroke="#fff" strokeOpacity={0.22} strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * La pieza sobre su escenario: flota 24 px sobre una línea de suelo, con la
 * sombra de contacto, el halo del color del pilar y el reflejo invertido.
 * `scale` lo encoge entero (móvil: la pieza a 140 de alto).
 */
export function BrandPieceStage({ rib, height = 340, caption, className }: { rib: RibbonName; height?: number; caption?: React.ReactNode; className?: string }) {
  const { width } = pieceBox(rib, height);
  const k = height / 340;
  const floor = 24 * k;
  return (
    <div
      className={cn("film-piece-stage", className)}
      data-rib={rib}
      style={{ "--pw": `${width}px`, "--ph": `${height}px`, "--k": k, "--floor": `${floor}px` } as CSSProperties}
      aria-hidden="true"
    >
      <span className="film-piece-halo" />
      <span className="film-piece-floor" />
      <span className="film-piece-contact" />
      <span className="film-piece-reflection">
        <BrandPiece rib={rib} height={height} />
      </span>
      <BrandPiece rib={rib} height={height} className="film-piece-body" />
      {caption ? <span className="film-piece-caption">{caption}</span> : null}
    </div>
  );
}
