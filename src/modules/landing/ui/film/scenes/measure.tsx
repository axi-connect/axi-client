import { FUNNEL_DESKTOP, FUNNEL_MOBILE, funnelPaths, parseFigure, type FunnelLayout } from "@/modules/landing/domain/film/funnel-fibers";
import type { FilmContent } from "@/modules/landing/domain/film/film-content";
import type { FilmNiche } from "@/modules/landing/domain/film/niches";
import { ByNiche } from "@/modules/landing/ui/film/parts/ByNiche";
import { SceneHead } from "@/modules/landing/ui/film/parts/SceneHead";

/**
 * Medir (plan §11, lienzo aprobado el 2026-09-30): una fibra por conversación
 * cruza cuatro puertas; las que no llegan se apagan en la suya y las que llegan
 * convergen en lo que produjeron. Las fibras son un SVG estático (tres `path`
 * con muchos subtrazos, `domain/film/funnel-fibers.ts`) que el motor revela de
 * izquierda a derecha con un `clipPath`; las cifras cuentan al pasar su puerta.
 */

/** % de la caja del embudo para una x o una y del lienzo. */
const px = (l: FunnelLayout, x: number) => `${(((x - l.view.x) / l.view.w) * 100).toFixed(3)}%`;
const py = (l: FunnelLayout, y: number) => `${(((y - l.view.y) / l.view.h) * 100).toFixed(3)}%`;

function Funnel({ c, niche, layout, variant }: { c: FilmContent; niche: FilmNiche; layout: FunnelLayout; variant: "desk" | "mob" }) {
  const counts = c.measure.steps.map(([, v]) => parseFigure(v));
  const { lost, won, dots } = funnelPaths(layout, counts);
  const { x, y, w, h } = layout.view;
  const clip = `funnel-${niche}-${variant}`;
  const desk = variant === "desk";
  // Las puertas: en escritorio van de y 430 a 800; en móvil, a lo alto de la franja.
  const gateTop = desk ? 430 : layout.band[0] - 12;
  const gateBottom = desk ? 800 : layout.band[1] + 8;
  return (
    <div className={desk ? "film-funnel max-lg:hidden" : "film-funnel film-funnel-mob lg:hidden"} style={{ aspectRatio: `${w} / ${h}` }}>
      {c.measure.steps.map(([label, value], i) => (
        <div key={label} data-anim="funnel-gate" data-x={layout.gates[i]}>
          <span className="film-funnel-line" style={{ left: px(layout, layout.gates[i]), top: py(layout, gateTop), height: py(layout, y + gateBottom - gateTop) }} />
          <span className="film-funnel-label" style={{ left: px(layout, layout.gates[i]), top: `calc(${py(layout, gateBottom)} + ${desk ? 8 : 10}px)` }}>
            <span className="film-h block text-[clamp(18px,2.1vw,30px)] tracking-[-0.03em] tabular-nums" data-anim="funnel-count" data-to={counts[i]}>
              {value}
            </span>
            <span className="film-dim mt-0.5 block text-[clamp(10px,0.9vw,12.5px)] leading-tight">{label}</span>
          </span>
        </div>
      ))}
      <svg className="absolute inset-0 size-full" viewBox={`${x} ${y} ${w} ${h}`} aria-hidden="true">
        <defs>
          <clipPath id={clip}>
            <rect data-anim="funnel-clip" data-from={desk ? 10 : 14} x={x} y={y} width={w} height={h} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip})`} fill="none" stroke="currentColor">
          <path d={lost} strokeWidth={desk ? 0.7 : 0.6} strokeOpacity={0.2} />
          <path d={dots} strokeWidth={desk ? 3 : 2.4} strokeOpacity={0.35} strokeLinecap="round" />
          <path d={won} strokeWidth={desk ? 1 : 0.9} strokeOpacity={0.75} />
        </g>
      </svg>
      <span className="film-funnel-glow" style={{ left: px(layout, layout.end.x), top: py(layout, layout.end.y) }} data-anim="funnel-glow" aria-hidden="true" />
    </div>
  );
}

function Produced({ c }: { c: FilmContent }) {
  return (
    <div data-anim="measure-result">
      <p className="film-eyebrow film-dim text-[10.5px] tracking-[0.18em]">Lo que produjeron</p>
      <p className="film-h mt-1.5 text-[clamp(56px,6.4vw,92px)] leading-none tracking-[-0.04em] whitespace-nowrap tabular-nums" data-anim="measure-produced" data-to={parseFigure(c.measure.produced)}>
        {c.measure.produced}
      </p>
      <p className="film-lead mt-2 text-sm max-lg:text-[12.5px]">
        en ventas pagadas este mes<span className="lg:hidden"> · calidad del agente {c.measure.quality} / 100</span>
      </p>
      <p className="film-lead mt-[18px] flex items-baseline gap-2 text-[13px] max-lg:hidden">
        <strong className="film-h text-2xl text-foreground">{c.measure.quality}</strong>/ 100 · calidad del agente, evaluada por una IA supervisora
      </p>
    </div>
  );
}

export function MeasureScene() {
  return (
    <section id="medir" data-scene="measure" aria-labelledby="medir-h" className="film-scene">
      <div className="film-spot top-[20%] left-[53%] size-[900px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--foreground)_5%,transparent),transparent)]" />
      <div className="film-wrap film-wrap-wide">
        <div className="grid items-start gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,760px)_minmax(0,380px)] lg:justify-between">
          <div className="min-w-0">
            <SceneHead
              id="medir-h"
              eyebrow="Medir"
              size="md"
              strong="Sabes cuánto te vendió"
              thin="cada conversación."
              lead={<span className="max-lg:hidden">Cada fibra es una conversación. Las que llegan al final son ventas pagadas.</span>}
            />
            {/* El envoltorio oculta en móvil: `.film-chip` (sin capa) le gana a `max-lg:hidden`. */}
            <div className="mt-5 max-lg:hidden">
              <p className="film-chip w-fit text-xs">Cifras de ejemplo</p>
            </div>
          </div>
          <div className="max-lg:hidden">
            <ByNiche>{(c) => <Produced c={c} />}</ByNiche>
          </div>
        </div>
        <ByNiche>
          {(c, niche) => (
            <>
              <Funnel c={c} niche={niche} layout={FUNNEL_DESKTOP} variant="desk" />
              <Funnel c={c} niche={niche} layout={FUNNEL_MOBILE} variant="mob" />
              <div className="mt-16 lg:hidden">
                <Produced c={c} />
              </div>
            </>
          )}
        </ByNiche>
      </div>
    </section>
  );
}
