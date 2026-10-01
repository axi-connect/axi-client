"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bot, ChevronRight } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useAuth } from "@/shared/auth/auth.hooks";
import { BentoTile } from "@/shared/components/features/bento";
import { EmptyState } from "@/shared/components/features/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { MarketingHeader } from "@/modules/marketing/ui/components/MarketingHeader";

import {
  ROUTINE_MODE_META,
  RUN_STATUS_META,
  scheduleLabel,
  sourceLabel,
  sourceSummary,
  type Routine,
  type RunSummary,
} from "../domain/autopilot";
import { failureLine } from "../domain/copy";
import { getRoutine, isAutopilotUnavailable, listRuns } from "../infrastructure/autopilot-service.adapter";
import { ActionCapsule } from "./recorrido/ActionCapsule";
import { FunnelRibbon } from "./recorrido/FunnelRibbon";
import { StatusDot } from "./recorrido/StatusDot";
import { whenLabel } from "./recorrido/when";

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Lo gastado este mes, si las salidas cargadas cubren el mes entero: con más
 * páginas y la última cargada aún dentro del mes, la suma se quedaría corta y
 * no se dice.
 */
function spentThisMonth(runs: readonly RunSummary[], hasMore: boolean, timeZone: string, now = new Date()): number | null {
  const month = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone }).slice(0, 7);
  const current = month(now.toISOString());
  const inMonth = runs.filter((run) => month(run.created_at) === current);
  const last = runs.at(-1);
  if (hasMore && last !== undefined && month(last.created_at) === current) return null;
  return inMonth.reduce((sum, run) => sum + run.credits_spent, 0);
}

/**
 * Una ruta (Rutas de captación, R4): la cápsula de acciones que aquí faltaba
 * (Pausar ↔ Reanudar · Salir ahora · Editar), qué busca, cómo escribe y cuándo
 * sale, y sus salidas una a una, cada una con su cinta de embudo para
 * compararlas sin abrirlas.
 */
export function RoutineDetailView({ routineId }: { routineId: string }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("leads:manage");
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(() => {
    Promise.all([getRoutine(routineId), listRuns(routineId)])
      .then(([detail, page]) => {
        setRoutine(detail);
        setRuns(page.items);
        setCursor(page.next_cursor);
        setFailure(null);
      })
      .catch((caught: unknown) => {
        if (isAutopilotUnavailable(caught)) setUnavailable(true);
        else setFailure(errorMessage(caught, "Revisa tu conexión e intenta otra vez."));
      });
  }, [routineId]);
  useEffect(() => load(), [load]);

  const { socket } = useSocket("inbox");
  useSocketEvent(socket, "autopilot.run_started", (payload) => payload.routine_id === routineId && load());
  useSocketEvent(socket, "autopilot.run_finished", (payload) => payload.routine_id === routineId && load());

  async function more() {
    if (cursor === null) return;
    setLoadingMore(true);
    try {
      const page = await listRuns(routineId, cursor);
      setRuns((current) => [...(current ?? []), ...page.items]);
      setCursor(page.next_cursor);
    } finally {
      setLoadingMore(false);
    }
  }

  if (unavailable) {
    return <EmptyState icon={Bot} title="Las rutas llegan con la próxima versión" description="Tu servidor todavía no trae el motor de las rutas de captación." />;
  }
  if (failure !== null) {
    return <EmptyState icon={Bot} title="No pudimos leer la ruta" description={failure} action={<Button onClick={load}>Reintentar</Button>} />;
  }
  if (routine === null || runs === null) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Cargando la ruta">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  const source = sourceLabel(routine.source.kind);
  const timeZone = routine.schedule.timezone;
  const mode = ROUTINE_MODE_META[routine.mode];
  const widest = Math.max(1, ...runs.map((run) => run.counters.found ?? 0));
  const spent = spentThisMonth(runs, cursor !== null, timeZone);
  const lastRun = runs[0]?.status ?? null;

  return (
    // `@container` aquí: la rejilla de las tres fichas consulta a su padre (una consulta no se mide a sí misma).
    <div className="@container flex min-w-0 flex-col gap-5">
      <MarketingHeader
        kicker="Marketing · Rutas"
        title={routine.name}
        description={`${scheduleLabel(routine.schedule)} · ${String(routine.schedule.leads_per_run)} cuentas y hasta ${String(routine.budget.per_run)} créditos por salida`}
        actions={canManage ? <ActionCapsule routine={routine} lastRun={lastRun} onChanged={load} /> : undefined}
      />

      <div className="grid gap-3.5 @[44rem]:grid-cols-3">
        <BentoTile label="Busca">
          <p className="text-[15px] font-medium">{source.label}</p>
          <p className="text-muted-foreground text-[12.5px] text-pretty">{sourceSummary(routine.source.params)}</p>
        </BentoTile>
        <BentoTile label="Antes de escribirles">
          <p className="text-[15px] font-medium">{mode.label}</p>
          <p className="text-muted-foreground text-[12.5px] text-pretty">{mode.hint}</p>
        </BentoTile>
        <BentoTile label="Próxima salida">
          <p className="text-[15px] font-medium">
            {routine.status === "paused"
              ? "Pausada · al reanudar"
              : routine.next_run_at === null
                ? "Sin programar"
                : capitalize(whenLabel(routine.next_run_at, timeZone))}
          </p>
          <p className="text-muted-foreground text-[12.5px]">
            Tope mensual: {String(routine.budget.per_month)} créditos{spent === null ? "" : ` · van ${String(spent)}`}
          </p>
        </BentoTile>
      </div>

      <BentoTile label="Salidas">
        {runs.length === 0 ? (
          <p className="text-muted-foreground text-sm">Todavía no ha salido.</p>
        ) : (
          <ul className="divide-border @container/runs flex flex-col divide-y">
            {runs.map((run) => {
              const meta = RUN_STATUS_META[run.status];
              const found = run.counters.found ?? 0;
              const qualified = run.counters.qualified ?? 0;
              const contacted = run.counters.contacted ?? 0;
              return (
                <li key={run.id}>
                  <Link
                    href={`/marketing/autopilot/runs/${run.id}`}
                    className="hover:bg-muted/40 focus-visible:outline-ring -mx-2 grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1.5 rounded-xl px-2 py-3 text-[13px] focus-visible:outline-2 @[46rem]/runs:grid-cols-[9.5rem_10.5rem_minmax(0,1fr)_5.75rem_1rem]"
                  >
                    <span className="whitespace-nowrap tabular-nums">{capitalize(whenLabel(run.created_at, timeZone))}</span>
                    <span className="justify-self-end @[46rem]/runs:justify-self-start">
                      <StatusDot tone={meta.tone}>{meta.label}</StatusDot>
                    </span>
                    <span className="col-span-2 grid min-w-0 gap-1 @[46rem]/runs:col-span-1">
                      <span className="text-muted-foreground text-[12.5px] text-pretty">
                        {String(found)} encontradas · {String(qualified)} calificadas · {String(contacted)} contactadas
                      </span>
                      {found > 0 ? (
                        <FunnelRibbon found={found} qualified={qualified} contacted={contacted} widest={widest} />
                      ) : (
                        <span className="text-muted-foreground text-xs text-pretty">
                          {run.status === "failed" ? failureLine(run, routine) : "No trajo cuentas en esta salida."}
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground whitespace-nowrap @[46rem]/runs:text-right">
                      {String(run.credits_spent)} {run.credits_spent === 1 ? "crédito" : "créditos"}
                    </span>
                    <ChevronRight aria-hidden className="text-muted-foreground size-4 justify-self-end" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {cursor !== null && (
          <Button variant="outline" size="sm" className="self-start rounded-full" disabled={loadingMore} onClick={() => void more()}>
            Ver más salidas
          </Button>
        )}
      </BentoTile>
    </div>
  );
}
