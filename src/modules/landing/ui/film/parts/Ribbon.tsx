import { cn } from "@/core/lib/utils";

/**
 * La cinta de luz: los tres trazos del isotipo (coral, ámbar y violeta) en
 * paralelo, con su halo. Es decorativa (`aria-hidden`) y va SIEMPRE por detrás
 * del texto (z-index 1 frente al 2 del contenido, film.css).
 *
 * `pathLength=1` permite al motor dibujarla con `stroke-dashoffset` de 1 a 0 sin
 * medir el trazo. Sin motor se ve completa.
 */
export function Ribbon({
  d,
  className,
  spread = 7,
  viewBox = "0 0 1440 900",
  preserve = "xMidYMid slice",
}: {
  d: string;
  className?: string;
  spread?: number;
  viewBox?: string;
  preserve?: string;
}) {
  const strokes = (
    <>
      <path className="c" d={d} pathLength={1} transform={`translate(0 ${-spread})`} data-ribbon-path="" />
      <path className="a" d={d} pathLength={1} data-ribbon-path="" />
      <path className="v" d={d} pathLength={1} transform={`translate(0 ${spread})`} data-ribbon-path="" />
    </>
  );
  return (
    <svg className={cn("film-ribbon", className)} viewBox={viewBox} preserveAspectRatio={preserve} aria-hidden="true" data-ribbon="">
      <g className="halo">{strokes}</g>
      <g className="line">{strokes}</g>
    </svg>
  );
}
