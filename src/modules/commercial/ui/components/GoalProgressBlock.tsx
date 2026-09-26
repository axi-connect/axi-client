"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, Flag } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { formatMoney } from "@/core/lib/format";
import { missingLine, paceHeadline, projectionLine } from "@/modules/commercial/domain/copy";
import { formatMillions, formatPct, monthLabel } from "@/modules/commercial/domain/format";
import { PACE_BADGES } from "@/modules/commercial/domain/labels";
import { displayStatus, expectedPct, isLearning, progressPct } from "@/modules/commercial/domain/pace";
import { weekTicks } from "@/modules/commercial/domain/weeks";
import { useCommercialRealtime } from "@/modules/commercial/infrastructure/realtime/use-commercial-realtime";
import { useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { RouteLine } from "./RouteLine";

/**
 * La meta del mes en el Panel: la ficha grande del bento (DESIGN-SYSTEM §9.5).
 * La cifra, la frase de la ruta (`paceHeadline`, la misma del hero de
 * Comercial), la línea con «hoy» y la proyección, y de dónde sale.
 * Autosuficiente (publicada por `commercial/public.ts`, consumida por
 * `dashboard`, que decide su sitio con `className`): carga lo suyo del store
 * compartido y **nunca bloquea**. Sin permiso, sin capacidad, bloqueada por el
 * plan o con error de red no pinta nada: un panel sin meta es mejor que un
 * panel con un error que no es suyo. Sin meta, una sola invitación a ponerla.
 */
export function GoalProgressBlock({ className }: { className?: string }) {
  const { hasPermission } = useAuth();
  const { loaded, hasCapability } = useEntitlements();
  const goal = useCommercialStore((state) => state.goal);
  const pace = useCommercialStore((state) => state.pace);
  const plan = useCommercialStore((state) => state.plan);
  const blocker = useCommercialStore((state) => state.blocker);
  const load = useCommercialStore((state) => state.load);
  const cancelStaleRetry = useCommercialStore((state) => state.cancelStaleRetry);

  const canRead = hasPermission("commercial:read");
  const canManage = hasPermission("commercial:manage");
  const enabled = loaded && hasCapability("crm") && canRead;

  useEffect(() => {
    if (enabled && goal.status === "idle") void load();
  }, [enabled, goal.status, load]);

  // Al salir del Panel no queda un reintento de ritmo caducado en vuelo (V4).
  useEffect(() => cancelStaleRetry, [cancelStaleRetry]);

  // F8: la ficha se mueve sola con `commercial.pace_updated` (y la meta con
  // `goal_set`), sin recargar el Panel.
  useCommercialRealtime({ enabled: enabled && blocker === null });

  // Con datos se pinta aunque se esté recargando (el refetch de un evento no
  // debe hacer parpadear la ficha); sin datos, nada.
  if (!enabled || blocker !== null || goal.data === null) return null;

  if (goal.data.goal === null) {
    // Sin permiso para fijarla, el enlace prometería un formulario que no se puede usar.
    if (!canManage) return null;
    return (
      <Link
        href="/comercial/meta"
        aria-label="Ponle una meta al mes y te trazamos el camino"
        className={cn(
          "group flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-3xl border-[1.5px] border-dashed border-foreground/15 bg-card/70 px-6 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="bg-foreground text-background flex size-11 shrink-0 items-center justify-center rounded-2xl">
            <Flag className="size-4.5" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-semibold text-pretty">Ponle una meta al mes y te trazamos el camino</span>
            <span className="text-muted-foreground text-xs text-pretty">Cuánto quieres vender; calculamos las ventas al día que hacen falta.</span>
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap group-hover:underline underline-offset-4">
          Definir la meta
          <ArrowRight aria-hidden className="size-3.5" />
        </span>
      </Link>
    );
  }

  if (pace.status === "error" || pace.data === null) return null;
  const p = pace.data;
  const status = displayStatus(p);
  const target = p.target_revenue_cents;
  const done = progressPct(p.actual_revenue_cents, target);
  const learning = isLearning(p);
  const expected = learning ? null : expectedPct(p.business_days_elapsed, p.business_days_total) / 100;
  const projected = learning || p.projected_revenue_cents === null || target <= 0 ? null : p.projected_revenue_cents / target;
  const projection = learning ? null : projectionLine(p.projected_revenue_cents, target, p.currency);
  const sales = p.key_results.find((kr) => kr.key === "sales");
  const salesTarget = sales?.target ?? plan.data?.figures.needed_sales.value ?? 0;
  const month = monthLabel(p.period_start);
  const headline = paceHeadline({
    status,
    currency: p.currency,
    actual_cents: p.actual_revenue_cents,
    target_cents: target,
    expected_cents: p.expected_revenue_cents,
    projected_cents: p.projected_revenue_cents,
    sales_actual: sales?.actual ?? 0,
    sales_target: salesTarget,
    days_left: p.business_days_left,
    days_until_projection: p.days_until_projection,
  });

  return (
    <section
      aria-label={`Tu meta de ${month}`}
      className={cn(
        "relative isolate flex min-w-0 flex-col gap-4 overflow-hidden rounded-3xl border border-border bg-card p-5 sm:px-7 sm:pt-6 sm:pb-5",
        className,
      )}
    >
      {/* Un brillo coral abajo a la izquierda: la ficha que manda en el bento. */}
      <div aria-hidden="true" className="bg-brand/10 pointer-events-none absolute -bottom-40 -left-24 -z-10 h-80 w-[30rem] rounded-full blur-3xl" />
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="text-muted-foreground font-sans text-xs font-normal">Tu meta de {month}</h2>
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-heading text-[2.6rem] leading-none font-bold tracking-tight tabular-nums sm:text-[3.3rem]">
              {formatMillions(p.actual_revenue_cents, p.currency)}
            </span>
            <span className="text-muted-foreground text-[15px] whitespace-nowrap">
              de {formatMoney(target, p.currency)} · <b className="text-foreground font-semibold">{formatPct(done)}</b>
            </span>
          </p>
        </div>
        <StatusBadge status={status} map={PACE_BADGES} appearance="dot" />
      </header>
      <p className="font-heading text-lg leading-snug font-semibold text-pretty sm:text-[19px]">{headline}</p>
      <RouteLine
        done={done / 100}
        expected={expected}
        projected={projected}
        projectedLabel={projection}
        figures={{ actual: formatMillions(p.actual_revenue_cents, p.currency), target: formatMoney(target, p.currency), projected: projection }}
        weeks={weekTicks(p.period_start, p.period_end, p.weekdays)}
      />
      <footer className="border-border flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-3.5">
        {salesTarget > 0 ? (
          <span className="text-muted-foreground text-xs whitespace-nowrap">Ventas: {missingLine(sales?.actual ?? 0, salesTarget)}</span>
        ) : (
          <span />
        )}
        <Link
          href="/comercial"
          className="inline-flex min-h-6 items-center gap-1 rounded-md text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Ver la ruta
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </footer>
    </section>
  );
}
