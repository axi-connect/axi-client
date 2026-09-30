"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/core/lib/utils";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";
import { BentoLink, BentoTile } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { sourceLabel } from "@/modules/autopilot/domain/autopilot";
import {
  barWidth,
  demosDelta,
  formatCredits,
  FUNNEL_STAGES,
  monthName,
  type PilotsSummaryDTO,
} from "@/modules/autopilot/domain/summary";
import { isAutopilotUnavailable } from "@/modules/autopilot/infrastructure/autopilot-service.adapter";
import { getPilotsSummary } from "@/modules/autopilot/infrastructure/summary-service.adapter";

type State =
  | { status: "loading"; data: PilotsSummaryDTO | null }
  | { status: "ready"; data: PilotsSummaryDTO }
  | { status: "error"; data: PilotsSummaryDTO | null }
  /** El servidor aún no trae el piloto (404): la ficha no se muestra. */
  | { status: "unavailable"; data: null };

/**
 * «Lo que trajeron los pilotos» (P6b, mockup aprobado): cuántas demos trajo el
 * piloto este mes, el embudo que las produjo, cuánto costaron en créditos y qué
 * fuente las trae más baratas. Autosuficiente, como `GoalProgressBlock`: pide
 * lo suyo y sin permiso o capacidad de captación no pinta nada.
 */
export function PilotsSummaryCard({ className }: { className?: string }) {
  const { hasPermission } = useAuth();
  const { loaded, hasCapability } = useEntitlements();
  const enabled = loaded && hasCapability("leads") && hasPermission("leads:read");
  const [state, setState] = useState<State>({ status: "loading", data: null });

  const load = useCallback(async () => {
    setState((prev) => ({ status: "loading", data: prev.data }));
    try {
      setState({ status: "ready", data: await getPilotsSummary() });
    } catch (error) {
      if (isAutopilotUnavailable(error)) setState({ status: "unavailable", data: null });
      else setState((prev) => ({ status: "error", data: prev.data }));
    }
  }, []);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  if (!enabled || state.status === "unavailable") return null;

  const month = state.data?.month;
  const label = `Lo que trajeron los pilotos${month === undefined ? "" : ` · ${monthName(month)}`}`;

  if (state.status === "error" && state.data === null) {
    return (
      <BentoTile label={label} className={className}>
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-pretty">No pudimos cargar lo que trajeron los pilotos.</p>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      </BentoTile>
    );
  }

  if (state.data === null) {
    return (
      <BentoTile label={label} className={className}>
        <div role="status" aria-label="Cargando lo que trajeron los pilotos" className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
          {[90, 70, 55, 35, 20].map((width) => (
            <Skeleton key={width} className="h-3 rounded-md" style={{ width: `${String(width)}%` }} />
          ))}
        </div>
      </BentoTile>
    );
  }

  const data = state.data;

  if (!data.has_routines) {
    return (
      <BentoTile label={label} className={className}>
        <div className="flex flex-col items-start gap-1.5">
          <p className="text-sm font-semibold">Aún no tienes pilotos</p>
          <p className="text-muted-foreground text-xs text-pretty">
            Un piloto busca cuentas que encajan con tu cliente ideal, les escribe a la hora que elijas y te muestra aquí
            lo que trajo.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-1 rounded-full">
            <Link href="/marketing/autopilot/new">Crear un piloto</Link>
          </Button>
        </div>
      </BentoTile>
    );
  }

  const delta = demosDelta(data.demos, data.demos_previous, data.month);
  const max = data.funnel.found;
  const [best, second] = data.best_sources;

  return (
    <BentoTile
      label={label}
      aside={<BentoLink href="/marketing/autopilot">Ver pilotos</BentoLink>}
      busy={state.status === "loading"}
      className={className}
    >
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-heading text-4xl leading-none font-bold tracking-tight tabular-nums">{data.demos}</span>
        <span className="text-muted-foreground text-sm">{data.demos === 1 ? "demo agendada" : "demos agendadas"}</span>
        {delta !== null && (
          // El verde sobre blanco no pasa AA en texto pequeño: el color va en el
          // punto; el texto conserva el contraste del cuerpo.
          <span className="text-foreground inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap">
            <span
              aria-hidden="true"
              className={cn("size-1.5 rounded-full", data.demos >= data.demos_previous ? "bg-success" : "bg-muted-foreground")}
            />
            {delta}
          </span>
        )}
      </div>

      <ol aria-label="Embudo del mes" className="flex flex-col gap-1.5">
        {FUNNEL_STAGES.map((stage, index) => {
          const value = data.funnel[stage.key];
          const last = index === FUNNEL_STAGES.length - 1;
          return (
            <li key={stage.key} className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_2.75rem] items-center gap-2.5 text-xs">
              <span className="text-muted-foreground truncate">{stage.label}</span>
              <span aria-hidden="true" className="bg-muted h-1.5 overflow-hidden rounded-full">
                <span
                  className={cn("block h-full rounded-full", last ? "bg-brand-gradient-tri" : "bg-foreground/80")}
                  style={{ width: `${String(barWidth(value, max))}%` }}
                />
              </span>
              <span className="text-right font-semibold tabular-nums">{value.toLocaleString("es-CO")}</span>
            </li>
          );
        })}
      </ol>

      <dl className="border-border/60 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-2.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-muted-foreground text-[11px]">Créditos por demo</dt>
          <dd className="text-sm font-semibold tabular-nums">
            {data.credits_per_demo === null ? "—" : formatCredits(data.credits_per_demo)}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-muted-foreground text-[11px]">Créditos del mes</dt>
          <dd className="text-sm font-semibold tabular-nums">
            {formatCredits(data.credits_month)}
            {data.credits_budget_month > 0 && ` de ${formatCredits(data.credits_budget_month)}`}
          </dd>
        </div>
      </dl>

      {best !== undefined && (
        <p className="text-muted-foreground flex items-start gap-2 text-xs text-pretty">
          <span aria-hidden="true" className="bg-accent-violet mt-1.5 size-1.5 shrink-0 rounded-full" />
          <span>
            <span className="text-foreground font-semibold">{sourceLabel(best.source).label}</span> trae demos a{" "}
            {formatCredits(best.credits_per_demo)} créditos
            {second !== undefined &&
              `; ${sourceLabel(second.source).label}, a ${formatCredits(second.credits_per_demo)}`}
            .
          </span>
        </p>
      )}
    </BentoTile>
  );
}
