import { PIECES, PIECES_SCENE } from "@/modules/landing/ui/content/productos.content";

/**
 * «Pieza por pieza» (plan §4). ESQUELETO de F1: las siete piezas con su `id`
 * y su titular, apiladas. La construye cinematic-landing-page en F3 (dock,
 * pantallas recreadas, avance con el scroll); el contrato es `PIECES` y el
 * evento `PIECES_SCENE.event`.
 */
export function ProductosPieces() {
  return (
    <div className="relative z-[1] flex w-full max-w-[1080px] flex-col gap-16">
      <p className="pj-eyebrow text-center text-[var(--axi-brand)]">{PIECES_SCENE.eyebrow}</p>
      <h2 id="piezas-title" className="sr-only">{PIECES_SCENE.eyebrow}</h2>
      {PIECES.map((piece) => (
        <section key={piece.id} id={piece.id} aria-label={piece.tab} className="flex flex-col items-center gap-2 text-center">
          <h3 className="pj-h pj-h-lg">
            {piece.strong} <span className="t">{piece.thin}</span>
          </h3>
          {piece.sample ? <span className="pj-dim text-xs">{PIECES_SCENE.sampleLabel}</span> : null}
        </section>
      ))}
    </div>
  );
}
