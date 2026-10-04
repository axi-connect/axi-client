import { Sparkles } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { FilmContent } from "@/modules/landing/domain/film/film-content";
import { parseFigure } from "@/modules/landing/domain/film/funnel-fibers";
import { ByNiche } from "@/modules/landing/ui/film/parts/ByNiche";
import { SceneHead } from "@/modules/landing/ui/film/parts/SceneHead";

/**
 * Ordenar (plan §11, lienzo aprobado el 2026-09-30): el pipeline como una mesa
 * en perspectiva. La tarjeta blanca del cliente se levanta de «Propuesta» (queda
 * el hueco punteado), vuela y aterriza en «Compromiso»; los conteos cambian y se
 * engancha la cita. El HTML trae el fotograma final: la tarjeta ya aterrizada.
 *
 * El tablero de escritorio se dibuja a 820 × 600 (coordenadas del lienzo) y se
 * escala entero (`--s`, film.css): la tarjeta vuela en esas coordenadas.
 */

/** Columnas del pipeline: nombre y oportunidades al final de la escena. */
const COLUMNS = [
  ["Nuevo", 6],
  ["Contactado", 4],
  ["Cita", 3],
  ["Propuesta", 4],
  ["Compromiso", 3],
] as const;
const OPEN = COLUMNS.reduce((n, [, c]) => n + c, 0);

/** La tarjeta del cliente (la misma en escritorio y en móvil). */
function DealCard({ c, className, anim }: { c: FilmContent; className?: string; anim?: string }) {
  return (
    <div className={cn("film-deal", className)} data-anim={anim} data-thread-target="">
      <p className="truncate text-sm font-semibold max-lg:text-[13px]">{c.pipeline.card.name}</p>
      <p className="film-deal-muted mt-0.5 truncate text-xs max-lg:text-[11px]">{c.pipeline.card.detail}</p>
      <p className="film-deal-chip">
        <Sparkles className="size-[11px] fill-[var(--axi-violet)] text-[var(--axi-violet)]" aria-hidden="true" />
        La abrió Axi
      </p>
    </div>
  );
}

function Appointment({ c, className, anim }: { c: FilmContent; className?: string; anim?: string }) {
  const a = c.pipeline.appointment;
  return (
    <div className={cn("film-appt", className)} data-anim={anim}>
      <span className="film-appt-day">
        <span className="text-[10px] font-semibold">{a.weekday}</span>
        <span className="film-h text-[22px] leading-none">{a.day}</span>
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] leading-snug font-semibold max-lg:text-[12.5px]">
          {a.time} · {a.title}
        </span>
        <span className="film-dim mt-0.5 block text-[11.5px] leading-snug max-lg:text-[11px]">{a.who}</span>
      </span>
    </div>
  );
}

/** Una oportunidad de relleno: dos barras. */
function Tile({ width }: { width: number }) {
  return (
    <div className="film-tile" aria-hidden="true">
      <span className="block h-2 rounded bg-[color-mix(in_srgb,var(--foreground)_20%,transparent)]" style={{ width: `${width}%` }} />
      <span className="mt-2.5 block h-1.5 w-[45%] rounded bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]" />
    </div>
  );
}

function Board({ c }: { c: FilmContent }) {
  return (
    <div className="film-board-stage max-lg:hidden">
      <div className="film-board-in">
        <div className="film-board-view">
          <div className="film-board-plane" data-anim="board-plane">
            {COLUMNS.map(([name, n], ci) => (
              <div key={name} className="flex min-w-0 flex-col gap-3">
                <div className="flex justify-between px-0.5 text-sm">
                  <strong className="truncate font-semibold">{name}</strong>
                  <span
                    className="film-dim tabular-nums"
                    data-anim={ci === 3 ? "count-left" : ci === 4 ? "count-landed" : undefined}
                    data-from={ci === 3 ? n + 1 : ci === 4 ? n - 1 : undefined}
                    data-to={ci === 3 || ci === 4 ? n : undefined}
                  >
                    {n}
                  </span>
                </div>
                {[0, 1, 2].map((k) => {
                  // Propuesta, arriba: el hueco que deja la tarjeta (sin motor ya está vacío).
                  if (ci === 3 && k === 0) {
                    return (
                      <div key={k} className="relative h-[92px]">
                        <div className="film-slot absolute inset-0" />
                        <div className="absolute inset-0 opacity-0" data-anim="board-leaving">
                          <Tile width={70} />
                        </div>
                      </div>
                    );
                  }
                  // Compromiso, arriba: donde aterriza.
                  if (ci === 4 && k === 0) return <div key={k} className="film-slot h-[92px] opacity-60" />;
                  return <Tile key={k} width={58 + 11 * ((ci + k) % 3)} />;
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="film-deal-shadow" data-anim="deal-shadow" aria-hidden="true" />
        <DealCard c={c} className="film-deal-fly" anim="deal" />
        <Appointment c={c} className="film-appt-fly" anim="appointment" />
      </div>
    </div>
  );
}

/** Móvil: dos columnas de la mesa y la tarjeta ya en su sitio (tablero «Móvil 390»). */
function BoardMobile({ c }: { c: FilmContent }) {
  return (
    <div className="flex w-full max-w-[340px] flex-col gap-6 lg:hidden">
      <div className="film-board-mobile">
        <div className="film-board-plane" data-anim="board-plane">
          {COLUMNS.slice(3).map(([name, n], ci) => (
            <div key={name} className="flex min-w-0 flex-col gap-[9px]">
              <div className="flex justify-between text-[12.5px]">
                <strong className="font-semibold">{name}</strong>
                <span className="film-dim tabular-nums">{n}</span>
              </div>
              <div className={cn("film-slot h-[70px] rounded-[14px]", ci === 1 && "opacity-60")} />
              <div className="film-tile h-[70px] rounded-[14px]" aria-hidden="true" />
              <div className="film-tile h-[70px] rounded-[14px]" aria-hidden="true" />
            </div>
          ))}
        </div>
        <DealCard c={c} className="film-deal-mobile" anim="deal-mobile" />
      </div>
      <Appointment c={c} anim="appointment-mobile" />
    </div>
  );
}

export function PipelineScene() {
  return (
    <section id="ordenar" data-scene="pipeline" aria-labelledby="ordenar-h" className="film-scene">
      <div className="film-spot top-[14%] left-[39%] size-[900px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--foreground)_5.5%,transparent),transparent)]" />
      <div className="film-wrap film-wrap-wide grid items-center gap-x-5 gap-y-8 lg:grid-cols-[clamp(280px,28vw,400px)_minmax(0,1fr)]">
        <div className="min-w-0">
          <SceneHead
            id="ordenar-h"
            eyebrow="Ordenar"
            strong="Todo queda"
            thin="en su lugar."
            lead="Cada conversación abre su oportunidad, agenda lo que haga falta y avanza sola en tu pipeline."
          />
          <ByNiche>
            {(c) => (
              <div className="mt-14 max-lg:mt-8">
                <p className="film-eyebrow film-dim text-[10.5px] tracking-[0.18em]">Pronóstico ponderado</p>
                <p className="film-h mt-1.5 text-[clamp(40px,3.9vw,56px)] tracking-[-0.035em] tabular-nums" data-anim="forecast" data-to={parseFigure(c.pipeline.forecast)}>
                  {c.pipeline.forecast}
                </p>
                <p className="film-dim mt-1.5 text-[13px]">
                  {OPEN} oportunidades abiertas en {COLUMNS.length} etapas
                </p>
              </div>
            )}
          </ByNiche>
        </div>
        <div className="flex min-w-0 justify-end max-lg:justify-center">
          <ByNiche>
            {(c) => (
              <>
                <Board c={c} />
                <BoardMobile c={c} />
              </>
            )}
          </ByNiche>
        </div>
      </div>
    </section>
  );
}
