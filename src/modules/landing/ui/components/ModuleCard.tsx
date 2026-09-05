import Link from "next/link";
import { CalendarClock, Check, Phone, Radar, Users, type LucideIcon } from "lucide-react";

import { formatInteger, formatQuantity, unitLabel } from "@/core/lib/commercial-units";
import { Button } from "@/shared/components/ui/button";
import { TiltCard } from "@/shared/components/ui/tilt-card";
import {
  MODULES_SECTION,
  formatCop,
  type ModuleId,
  type ModuleOffer,
} from "@/modules/landing/ui/content/landing.content";

/**
 * Icono de cada Módulo. Mapa cerrado por `id` a propósito: un nombre de icono
 * en el content obligaría a un diccionario dinámico y a arrastrar todo lucide.
 */
export const MODULE_ICONS: Record<ModuleId, LucideIcon> = {
  calls: Phone,
  leads: Radar,
  crm: Users,
  scheduling: CalendarClock,
};

/**
 * Tarjeta de un Módulo (mockup F0-A v3, aprobado 2026-09-01).
 *
 * El precio llega del catálogo público (`priceCop`); el copy —cuota, extras,
 * viñetas— sigue en el content. Sin precio publicado la tarjeta lo dice y
 * manda a ventas en vez de inventar una cifra.
 *
 * Misma anatomía que sus hermanas de Paquete: `TiltCard depth={6}` con reflejo
 * que sigue al cursor. La superficie es **`.glass-flat`** y no `.glass`: bajo el
 * transform 3D del tilt un `backdrop-filter` captura otro backdrop y recalcula
 * el blur por frame (docs/modules/public-site.md §4.1) — mismo aspecto, sin
 * filtro. El halo (`.brand-sheen`) y el resplandor tricolor son los de
 * `BrandCard`, para que las tres tarjetas de la capa pública sean un material.
 */
export function ModuleCard({ offer, priceCop }: { offer: ModuleOffer; priceCop: number | null }) {
  const Icon = MODULE_ICONS[offer.id];
  const { allowance } = offer;

  return (
    <TiltCard depth={6} className="h-full">
      <article
        data-testid={`module-${offer.id}`}
        className="group glass-flat relative isolate z-0 grid h-full gap-6 overflow-hidden rounded-2xl p-7 transition-[border-color,box-shadow] duration-200 hover:border-brand/35 hover:shadow-overlay md:grid-cols-[minmax(0,1.45fr)_minmax(13rem,0.85fr)] md:gap-8 md:p-8"
      >
        <div
          aria-hidden="true"
          className="brand-sheen pointer-events-none absolute inset-0 -z-10 transition-[background-image] duration-200"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[10%] -z-10 opacity-0 blur-[46px] transition-opacity duration-200 group-hover:opacity-[0.12]"
          style={{
            backgroundImage:
              "conic-gradient(var(--color-brand) 0deg, var(--color-brand) 117deg," +
              "var(--color-accent-violet) 190deg, var(--color-accent-amber) 285deg, var(--color-brand) 360deg)",
          }}
        />

        <div className="relative flex min-w-0 flex-col gap-4">
          <div className="flex items-center gap-3.5">
            <span className="channel-logo-plate grid size-13 shrink-0 place-items-center rounded-xl">
              <Icon aria-hidden="true" className="text-brand size-6" />
            </span>
            <div className="min-w-0">
              <p className="text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.18em] uppercase">
                {MODULES_SECTION.kicker.replace(/s$/, "")}
              </p>
              <h3 className="font-heading mt-0.5 text-[1.375rem] leading-tight font-bold tracking-tight">
                {offer.name}
              </h3>
            </div>
          </div>

          <p className="text-muted-foreground max-w-[34rem] text-sm leading-relaxed text-pretty">
            {offer.tagline}
          </p>

          <ul className="flex flex-col gap-2.5">
            {offer.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2.5 text-sm leading-relaxed">
                <Check aria-hidden="true" className="text-brand mt-1 size-[0.9375rem] shrink-0" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-border/90 bg-background/70 relative flex flex-col gap-3.5 rounded-2xl border p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]">
          <span aria-hidden="true" className="bg-brand-gradient absolute inset-x-5 -top-px h-0.5 rounded-full" />
          <p className="text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">
            {MODULES_SECTION.allowanceLabel}
          </p>
          <div>
            <p className="font-mono text-[2.75rem] leading-none font-semibold tracking-tight tabular-nums">
              {formatInteger(allowance.quantity)}
            </p>
            <p className="mt-1 text-[0.9375rem] font-medium">
              {unitLabel(allowance.unit, allowance.quantity)} al mes
            </p>
          </div>
          <p className="text-muted-foreground text-[0.8125rem] leading-relaxed">
            {allowance.equivalent
              ? `≈ ${formatQuantity(allowance.equivalent.quantity, allowance.equivalent.unit)} · ${offer.extras}`
              : offer.extras}
          </p>
          <hr className="border-foreground/15 border-dashed" />
          {priceCop === null ? (
            <p className="text-muted-foreground text-sm leading-relaxed">Precio a consulta</p>
          ) : (
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-mono text-[1.75rem] font-semibold tracking-tight tabular-nums">
                {formatCop(priceCop)}
              </span>
              <span className="text-muted-foreground text-sm">{offer.priceUnit}</span>
            </p>
          )}
          <div className="mt-1 flex flex-col gap-2">
            <Button asChild size="lg" variant="outline" className="h-11 w-full">
              <Link href={priceCop === null ? "/contacto" : offer.cta.href}>
                {priceCop === null ? "Hablar con ventas" : offer.cta.label}
              </Link>
            </Button>
            <p className="text-muted-foreground text-center text-xs leading-relaxed">
              {priceCop === null ? "Te respondemos el mismo día." : offer.ctaMicrocopy}
            </p>
          </div>
        </div>
      </article>
    </TiltCard>
  );
}
