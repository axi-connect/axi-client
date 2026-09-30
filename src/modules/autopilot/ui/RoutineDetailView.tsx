"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bot, ChevronRight, Pencil } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDateTime } from "@/core/lib/format";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useAuth } from "@/shared/auth/auth.hooks";
import { BentoTile, StatePill } from "@/shared/components/features/bento";
import { EmptyState } from "@/shared/components/features/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { MarketingHeader } from "@/modules/marketing/ui/components/MarketingHeader";

import {
  RUN_STATUS_META,
  scheduleLabel,
  sourceLabel,
  sourceSummary,
  type Routine,
  type RunSummary,
} from "../domain/autopilot";
import { getRoutine, isAutopilotUnavailable, listRuns } from "../infrastructure/autopilot-service.adapter";

/**
 * Un piloto: qué busca, cuándo y cuánto, y sus ejecuciones una a una (la más
 * reciente primero), cada una con su estado, lo que trajo y lo que gastó.
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
    return <EmptyState icon={Bot} title="El piloto llega con la próxima versión" description="Tu servidor todavía no trae el motor del piloto automático." />;
  }
  if (failure !== null) {
    return <EmptyState icon={Bot} title="No pudimos leer el piloto" description={failure} action={<Button onClick={load}>Reintentar</Button>} />;
  }
  if (routine === null || runs === null) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Cargando el piloto">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  const source = sourceLabel(routine.source.kind);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <MarketingHeader
        kicker="Marketing · Automatización · piloto"
        title={routine.name}
        description={`${scheduleLabel(routine.schedule)} · ${String(routine.schedule.leads_per_run)} cuentas y hasta ${String(routine.budget.per_run)} créditos por ejecución`}
        actions={
          canManage ? (
            <Button asChild variant="outline" className="rounded-full">
              <Link href={`/marketing/autopilot/${routine.id}/edit`}>
                <Pencil aria-hidden className="size-4" />
                Editar piloto
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 @container @[44rem]:grid-cols-3">
        <BentoTile label="Busca">
          <p className="text-sm font-medium">{source.label}</p>
          <p className="text-muted-foreground text-xs text-pretty">{sourceSummary(routine.source.params)}</p>
        </BentoTile>
        <BentoTile label="Modo">
          <p className="text-sm font-medium">{routine.mode === "assisted" ? "Asistido" : "Autónomo"}</p>
          <p className="text-muted-foreground text-xs text-pretty">
            {routine.mode === "assisted" ? "Te pide aprobar el lote antes de contactar." : "Contacta sin esperar tu aprobación."}
          </p>
        </BentoTile>
        <BentoTile label="Siguiente ejecución">
          <p className="text-sm font-medium">
            {routine.status === "paused"
              ? "Pausado · al reanudar"
              : routine.next_run_at === null
                ? "Sin programar"
                : formatShortDateTime(routine.next_run_at)}
          </p>
          <p className="text-muted-foreground text-xs">Tope mensual: {String(routine.budget.per_month)} créditos</p>
        </BentoTile>
      </div>

      <BentoTile label="Ejecuciones">
        {runs.length === 0 ? (
          <p className="text-muted-foreground text-sm">Todavía no se ha ejecutado.</p>
        ) : (
          <ul className="divide-border divide-y">
            {runs.map((run) => {
              const meta = RUN_STATUS_META[run.status];
              return (
                <li key={run.id}>
                  <Link
                    href={`/marketing/autopilot/runs/${run.id}`}
                    className="hover:bg-muted/40 -mx-2 flex min-h-12 items-center gap-3 rounded-xl px-2 py-2 text-sm"
                  >
                    <span className="w-36 shrink-0 tabular-nums">{formatShortDateTime(run.created_at)}</span>
                    <StatePill tone={meta.tone}>{meta.label}</StatePill>
                    <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                      {String(run.counters.found ?? 0)} encontradas · {String(run.counters.qualified ?? 0)} calificadas ·{" "}
                      {String(run.counters.contacted ?? 0)} contactadas · {String(run.credits_spent)} créditos
                    </span>
                    <ChevronRight aria-hidden className="text-muted-foreground size-4 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {cursor !== null && (
          <Button variant="outline" size="sm" className="self-start rounded-full" disabled={loadingMore} onClick={() => void more()}>
            Ver más ejecuciones
          </Button>
        )}
      </BentoTile>
    </div>
  );
}
