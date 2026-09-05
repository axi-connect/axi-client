"use client";

import { FlipCountdown } from "@/modules/landing/ui/components/FlipCountdown";
import { TiltCard } from "@/shared/components/ui/tilt-card";
import {
  discountLabel,
  promotionLastDay,
  type CatalogPromotion,
} from "@/modules/landing/domain/public-catalog";
import {
  FOUNDERS,
  formatDeadline,
  formatDeadlineLong,
  foundersHeadline,
} from "@/modules/landing/ui/content/landing.content";

/**
 * Tarjeta del Programa Fundadores: la urgencia de §9.
 *
 * Cupos, descuento y fecha llegan del catálogo público (`promotion`): el
 * contador ya no es una constante que alguien tiene que subir a mano al
 * cerrar cada venta. Sin promoción abierta —por fecha o por cupos, lo que
 * ocurra primero— la tarjeta no se pinta: `PricingPlans` decide.
 *
 * Isla oscura de marca (`.dark` + `.theme-dark-island`, ver globals.css) con
 * las tres cintas del isotipo como halos difusos: es un momento de marca, el
 * único de la sección, y el corte de luminosidad contra la página es lo que le
 * da presencia. Se mantiene oscura en ambos temas a propósito.
 */
export function FoundersBar({ promotion }: { promotion: CatalogPromotion }) {
  const slots = promotion.slots;
  const taken = slots === null ? promotion.taken : Math.min(promotion.taken, slots);
  const takenRatio = slots === null ? 0 : Math.min(1, taken / slots);
  const lastDay = promotionLastDay(promotion);

  return (
    // El tilt escala un 2 % al pasar el cursor: sin este clip, en viewports
    // estrechos la tarjeta empujaría el ancho de la página.
    <TiltCard depth={3} glare="bright" className="overflow-x-clip">
      <div className="dark theme-dark-island bg-founders-slab text-foreground relative overflow-hidden rounded-2xl border border-white/10 p-7 md:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-14">
          <div className="min-w-0 flex-1">
            <p className="text-accent-amber text-xs font-semibold tracking-[0.18em] uppercase">
              {promotion.name || FOUNDERS.kicker}
            </p>

            <h3 className="font-heading mt-3 text-2xl leading-tight font-bold tracking-tight text-balance md:text-3xl">
              {foundersHeadline(discountLabel(promotion), slots)}
            </h3>

            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed">
              {FOUNDERS.promise}
            </p>

            {slots !== null ? (
              <div className="mt-7 flex items-center gap-4">
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={slots}
                  aria-valuenow={taken}
                  aria-label={`${taken} de ${slots} cupos del programa de fundadores ya tomados`}
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
                  <span className="text-foreground font-semibold">{taken}</span>
                  <span className="text-muted-foreground"> de {slots} tomados</span>
                </p>
              </div>
            ) : null}
          </div>

          {lastDay !== null ? (
            <div className="shrink-0">
              <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
                {FOUNDERS.countdownLabel}
              </p>
              <FlipCountdown className="mt-3" deadline={lastDay} deadlineLabel={formatDeadline(lastDay)} />
              <p className="text-muted-foreground mt-3 text-xs">Hasta el {formatDeadlineLong(lastDay)}</p>
            </div>
          ) : null}
        </div>
      </div>
    </TiltCard>
  );
}
