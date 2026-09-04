"use client";

import { FlipCountdown } from "@/modules/landing/ui/components/FlipCountdown";
import { TiltCard } from "@/shared/components/ui/tilt-card";
import {
  FOUNDERS,
  formatDeadline,
  formatDeadlineLong,
  foundersRemaining,
} from "@/modules/landing/ui/content/landing.content";

/**
 * Tarjeta del Programa Fundadores: la urgencia de §9.
 *
 * Isla oscura de marca (`.dark` + `.theme-dark-island`, ver globals.css) con
 * las tres cintas del isotipo como halos difusos: es un momento de marca, el
 * único de la sección, y el corte de luminosidad contra la página es lo que le
 * da presencia. Se mantiene oscura en ambos temas a propósito.
 *
 * Composición en dos columnas: a la izquierda el argumento (titular en Nexa,
 * promesa y la barra de cupos), a la derecha el tiempo. Nada de columnas a
 * medio llenar — el titular ocupa el ancho que le sobra al contador.
 */
export function FoundersBar() {
  const remaining = foundersRemaining();
  const taken = Math.min(FOUNDERS.claimed, FOUNDERS.slots);
  const takenRatio = Math.min(1, taken / FOUNDERS.slots);

  return (
    // El tilt escala un 2 % al pasar el cursor: sin este clip, en viewports
    // estrechos la tarjeta empujaría el ancho de la página.
    <TiltCard depth={3} glare="bright" className="overflow-x-clip">
      <div className="dark theme-dark-island bg-founders-slab text-foreground relative overflow-hidden rounded-2xl border border-white/10 p-7 md:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-14">
          <div className="min-w-0 flex-1">
            <p className="text-accent-amber text-xs font-semibold tracking-[0.18em] uppercase">
              {FOUNDERS.kicker}
            </p>

            <h3 className="font-heading mt-3 text-2xl leading-tight font-bold tracking-tight text-balance md:text-3xl">
              {FOUNDERS.headline}
            </h3>

            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed">
              {FOUNDERS.promise}
            </p>

            <div className="mt-7 flex items-center gap-4">
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={FOUNDERS.slots}
                aria-valuenow={taken}
                aria-label={`${taken} de ${FOUNDERS.slots} cupos del programa de fundadores ya tomados`}
                className="relative h-1 max-w-xs flex-1 rounded-full bg-white/12"
              >
                <div
                  className="bar-neon absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${takenRatio * 100}%` }}
                />
              </div>
              {/* El testid da un asidero al contador: el <p> envuelve dos
                  <span>, así que no tiene nodos de texto directos y
                  `getByText` no puede matchear la frase completa. */}
              <p data-testid="founders-slots" className="shrink-0 font-mono text-xs tabular-nums">
                {remaining > 0 ? (
                  <>
                    <span className="text-foreground font-semibold">{taken}</span>
                    <span className="text-muted-foreground"> de {FOUNDERS.slots} tomados</span>
                  </>
                ) : (
                  <span className="text-accent-amber font-semibold">{FOUNDERS.soldOut}</span>
                )}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
              {FOUNDERS.countdownLabel}
            </p>
            <FlipCountdown
              className="mt-3"
              deadline={FOUNDERS.deadline}
              deadlineLabel={formatDeadline(FOUNDERS.deadline)}
            />
            <p className="text-muted-foreground mt-3 text-xs">
              Hasta el {formatDeadlineLong(FOUNDERS.deadline)}
            </p>
            {/* El plazo ya se movió una vez. Decir que es la última extensión
                es lo que impide que «fundador» pierda significado. */}
            <p className="text-muted-foreground mt-1 text-xs font-medium">
              {FOUNDERS.lastCallNote}
            </p>
          </div>
        </div>
      </div>
    </TiltCard>
  );
}
