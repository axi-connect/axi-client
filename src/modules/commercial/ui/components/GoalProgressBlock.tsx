"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, Route } from "lucide-react";

import { formatMoney } from "@/core/lib/format";
import { formatCount, formatMillions, formatPct, monthLabel } from "@/modules/commercial/domain/format";
import { PACE_BADGES } from "@/modules/commercial/domain/labels";
import { expectedPct, gap, progressPct } from "@/modules/commercial/domain/pace";
import { useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { RouteLine } from "./RouteLine";

/**
 * La franja de la meta en el Panel: la cifra, la línea compacta y «Ver la
 * ruta →». Autosuficiente (publicada por `commercial/public.ts`, consumida
 * por `dashboard`): carga lo suyo del store compartido y **nunca bloquea**.
 * Sin permiso, sin capacidad, bloqueada por el plan o con error de red no
 * pinta nada: un panel sin franja es mejor que un panel con un error que no
 * es suyo (regla del banner de onboarding). Sin meta, una sola línea que
 * lleva a ponerla.
 */
export function GoalProgressBlock() {
  const { hasPermission } = useAuth();
  const { loaded, hasCapability } = useEntitlements();
  const goal = useCommercialStore((state) => state.goal);
  const pace = useCommercialStore((state) => state.pace);
  const blocker = useCommercialStore((state) => state.blocker);
  const load = useCommercialStore((state) => state.load);

  const canRead = hasPermission("commercial:read");
  const enabled = loaded && hasCapability("crm") && canRead;

  useEffect(() => {
    if (enabled && goal.status === "idle") void load();
  }, [enabled, goal.status, load]);

  if (!enabled || blocker !== null || goal.status !== "ready" || goal.data === null) return null;

  if (goal.data.goal === null) {
    return (
      <section aria-label="Sin meta" className="rounded-2xl border border-border bg-background px-5 py-3.5">
        <Link
          href="/comercial/meta"
          className="inline-flex items-center gap-2 text-[14px] font-medium text-foreground hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          <Route aria-hidden className="size-4" />
          Ponle una meta al mes y te trazamos el camino
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </section>
    );
  }

  if (pace.status === "error" || pace.data === null) return null;
  const p = pace.data;
  const done = progressPct(p.actual_revenue_cents, p.target_revenue_cents);
  const learning = p.data_sufficiency !== "ok";
  const expected = learning ? null : expectedPct(p.business_days_elapsed, p.business_days_total) / 100;
  const projected = learning || p.projected_revenue_cents === null ? null : p.projected_revenue_cents / p.target_revenue_cents;
  const month = monthLabel(p.period_start);

  return (
    <section
      aria-label={`Tu meta de ${month}`}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 rounded-2xl border border-border bg-background px-5 py-3.5"
    >
      <p className="text-[12px] text-muted-foreground">Tu meta de {month}</p>
      <div className="row-span-3 self-center text-right text-[13px]">
        <span className="font-heading block text-[22px] leading-none tracking-tight tabular-nums">{formatPct(done)}</span>
        <span className="text-muted-foreground">
          {p.business_days_left === 1 ? "falta 1 día hábil" : `faltan ${formatCount(p.business_days_left)} días hábiles`}
        </span>
        <Link
          href="/comercial"
          className="mt-1 inline-flex items-center gap-1 font-medium text-foreground hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          Ver la ruta
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
      <p className="flex flex-wrap items-baseline gap-x-2 text-[14.5px]">
        <b className="font-semibold tabular-nums">{formatMillions(p.actual_revenue_cents, p.currency)}</b>
        <span className="text-muted-foreground">
          de {formatMoney(p.target_revenue_cents, p.currency)}
          {gap(p.actual_revenue_cents, p.target_revenue_cents).missing > 0
            ? ` · faltan ${formatMillions(gap(p.actual_revenue_cents, p.target_revenue_cents).missing, p.currency)}`
            : ""}
        </span>
        <StatusBadge status={p.status} map={PACE_BADGES} appearance="dot" />
      </p>
      <RouteLine compact done={done / 100} expected={expected} projected={projected} className="mt-1" />
    </section>
  );
}
