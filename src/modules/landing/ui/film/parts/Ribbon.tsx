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
  axis = "y",
}: {
  /** Hacia dónde se separan las hebras: `x` para cintas casi verticales. */
  axis?: "x" | "y";
  d: string;
  className?: string;
  spread?: number;
  viewBox?: string;
  preserve?: string;
}) {
  const at = (n: number) => (axis === "x" ? `translate(${n} 0)` : `translate(0 ${n})`);
  const strokes = (
    <>
      <path className="c" d={d} pathLength={1} transform={at(-spread)} data-ribbon-path="" />
      <path className="a" d={d} pathLength={1} data-ribbon-path="" />
      <path className="v" d={d} pathLength={1} transform={at(spread)} data-ribbon-path="" />
    </>
  );
  return (
    <svg className={cn("film-ribbon", className)} viewBox={viewBox} preserveAspectRatio={preserve} aria-hidden="true" data-ribbon="" data-axis={axis}>
      <g className="halo">{strokes}</g>
      <g className="line">{strokes}</g>
    </svg>
  );
}
