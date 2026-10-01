"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Plus, Route } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useAuth } from "@/shared/auth/auth.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { MarketingHeader } from "@/modules/marketing/ui/components/MarketingHeader";

import { ROUTINE_MODE_META, RUN_STATUS_META, scheduleLabel, sourceLabel, sourceSummary, type RoutineListItem } from "../domain/autopilot";
import { ahoraMismo, routineStatusLine } from "../domain/copy";
import { runTrajectory } from "../domain/trajectory";
import { isAutopilotUnavailable, listRoutines } from "../infrastructure/autopilot-service.adapter";
import { PilotProposals } from "./proposals/PilotProposals";
import { ActionCapsule } from "./recorrido/ActionCapsule";
import { AhoraMismo } from "./recorrido/AhoraMismo";
import { MiniTrajectory } from "./recorrido/MiniTrajectory";
import { StatusDot } from "./recorrido/StatusDot";
import { whenLabel } from "./recorrido/when";
import { PilotsSummaryCard } from "./summary/PilotsSummaryCard";

/**
 * Marketing › Rutas (Rutas de captación, R2): «Ahora mismo» si algo pide tu
 * atención, lo que trajeron tus rutas este mes, «Axi propone» y cada ruta en
 * su tarjeta —una línea con fuente, horario y modo, su ruta en miniatura y la
 * cápsula de acciones—.
 *
 * Se refresca por los eventos `autopilot.*` de la sala de la empresa, también
 * `item_moved` (si no, «paso X de N» y la miniatura se quedaban congelados).
 */
export function AutopilotListView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("leads:manage");
  const [routines, setRoutines] = useState<RoutineListItem[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ahora = useMemo(() => (routines === null ? null : ahoraMismo(routines)), [routines]);
  const routineNames = useMemo(() => new Map((routines ?? []).map((routine) => [routine.id, routine.name])), [routines]);

  const load = useCallback(() => {
    listRoutines()
      .then((result) => {
        setRoutines(result.items);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (isAutopilotUnavailable(caught)) setUnavailable(true);
        else setError(errorMessage(caught, "Revisa tu conexión e intenta otra vez."));
      });
  }, []);
  useEffect(() => load(), [load]);

  const { socket } = useSocket("inbox");
  useSocketEvent(socket, "autopilot.run_started", () => load());
  useSocketEvent(socket, "autopilot.item_moved", () => load());
  useSocketEvent(socket, "autopilot.run_finished", () => load());
  useSocketEvent(socket, "autopilot.batch_ready", () => load());

  const inMotion = (routines ?? []).filter((routine) => {
    const status = routine.last_run?.status;
    return status === "running" || status === "queued" || status === "awaiting_approval";
  }).length;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <MarketingHeader
        title="Axi sale a buscar clientes por ti"
        description="Cada ruta sale a su hora, trae negocios que encajan contigo y les escribe a quien decide. Tú pones el tope."
        actions={
          canManage && !unavailable ? (
            <Button asChild className="rounded-full">
              <Link href="/marketing/autopilot/new">
                <Route aria-hidden className="size-4" />
                Nueva ruta
              </Link>
            </Button>
          ) : undefined
        }
      />

      {unavailable ? (
        <EmptyState
          icon={Bot}
          title="Las rutas llegan con la próxima versión"
          description="Tu servidor todavía no trae el motor de las rutas de captación. En cuanto se actualice, aquí programas tus rutas."
        />
      ) : error !== null ? (
        <EmptyState icon={Bot} title="No pudimos leer tus rutas" description={error} action={<Button onClick={load}>Reintentar</Button>} />
      ) : routines === null ? (
        <div className="grid gap-4" role="status" aria-label="Cargando rutas">
          <Skeleton className="h-56 w-full rounded-3xl" />
          <Skeleton className="h-56 w-full rounded-3xl" />
        </div>
      ) : routines.length === 0 ? (
        <EmptyState
          icon={Route}
          title="Tu primera ruta"
          description="Elige dónde buscar, a quién dejar pasar, cómo escribirles y hasta cuánto gastar. Axi sale solo, en tu horario, y te avisa cuando alguien responde."
          action={
            canManage ? (
              <Button asChild>
                <Link href="/marketing/autopilot/new">
                  <Plus aria-hidden className="size-4" />
                  Crear una ruta
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* «Ahora mismo»: solo si hay algo en ruta o esperando. */}
          {ahora !== null && <AhoraMismo ahora={ahora} />}
          {/* «Lo que trajeron tus rutas»: la misma ficha del Panel; se oculta sola sin permiso o sin datos. */}
          <PilotsSummaryCard />
          {/* P6b: «Axi propone», solo si hay algo que decidir */}
          <PilotProposals routineNames={routineNames} canManage={canManage} />
          <section className="flex flex-col gap-3.5" aria-labelledby="routes-title">
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <h2 id="routes-title" className="text-[17px] font-semibold tracking-[-0.01em]">
                Tus rutas
              </h2>
              <span className="text-muted-foreground text-[13px]">
                {routines.length === 1 ? "1 ruta" : `${String(routines.length)} rutas`}
                {inMotion > 0 && ` · ${String(inMotion)} en marcha`}
              </span>
            </div>
            {routines.map((routine) => (
              <RoutineCard key={routine.id} routine={routine} canManage={canManage} onChanged={load} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function RoutineCard({ routine, canManage, onChanged }: { routine: RoutineListItem; canManage: boolean; onChanged: () => void }) {
  const run = routine.last_run;
  const live = run !== null && (run.status === "running" || run.status === "queued");
  const waiting = run !== null && run.status === "awaiting_approval";
  const source = sourceLabel(routine.source.kind);
  const status = routineStatusLine(routine);
  const mode = ROUTINE_MODE_META[routine.mode];
  const trajectory = run === null ? null : runTrajectory(run, routine);
  const timeZone = routine.schedule.timezone;
  const next = routine.status === "paused" ? "al reanudar" : routine.next_run_at === null ? "sin programar" : whenLabel(routine.next_run_at, timeZone);
  // «Espera tu aprobación · hoy, 8:00 · 0 contactados · 9 créditos»: la última salida en una línea.
  const lastLine =
    run === null
      ? "Todavía no ha salido."
      : [
          RUN_STATUS_META[run.status].label,
          whenLabel(run.created_at, timeZone),
          `${String(run.counters.contacted ?? 0)} contactados`,
          `${String(run.credits_spent)} ${run.credits_spent === 1 ? "crédito" : "créditos"}`,
        ].join(" · ");

  return (
    <article className="bg-card border-border @container/card flex min-w-0 flex-col gap-4 rounded-3xl border p-5 sm:px-[22px]">
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-muted-foreground text-xs">Ruta · {mode.label.toLowerCase()}</span>
        <StatusDot tone={status.tone} live={status.live}>
          {status.label}
        </StatusDot>
      </div>
      <div className="flex flex-col items-start justify-between gap-3.5 @[38.75rem]/card:flex-row">
        <div className="min-w-0">
          <h3 className="font-heading text-[21px] leading-tight font-bold tracking-[-0.02em]">
            <Link href={`/marketing/autopilot/${routine.id}`} className="break-words hover:underline">
              {routine.name}
            </Link>
          </h3>
          <p className="text-muted-foreground mt-1 text-[13.5px] text-pretty">{lastLine}</p>
        </div>
        {run !== null && (
          <Button asChild variant="glass" className="h-[38px] shrink-0 px-[18px]">
            <Link href={`/marketing/autopilot/runs/${run.id}`}>
              {waiting ? "Revisar el lote" : live ? "Ver en vivo" : "Ver la salida"}
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </Button>
        )}
      </div>

      {trajectory !== null && run !== null && (
        <MiniTrajectory
          trajectory={trajectory}
          running={run.status === "running"}
          showPlane={run.status === "running" || run.status === "awaiting_approval" || run.status === "paused"}
        />
      )}

      <div className="grid gap-2.5 @[38.75rem]/card:grid-cols-3">
        <Zone title="Busca" lines={[sourceSummary(routine.source.params)]}>
          <span aria-hidden className="bg-foreground text-background grid size-5 shrink-0 place-items-center rounded-full text-[10.5px] font-semibold">
            {source.initial}
          </span>
          {source.label}
        </Zone>
        <Zone title="Cuándo y cuánto" lines={[`${String(routine.schedule.leads_per_run)} cuentas y hasta ${String(routine.budget.per_run)} créditos por salida`, `Próxima salida: ${next}`]}>
          {scheduleLabel(routine.schedule)}
        </Zone>
        <Zone title="Modo" lines={[mode.hint]}>
          {mode.label}
        </Zone>
      </div>

      {canManage && (
        <div>
          <ActionCapsule routine={routine} lastRun={run?.status ?? null} withEdit={false} onChanged={onChanged} />
        </div>
      )}
    </article>
  );
}

/** Una zona de la tarjeta: Busca · Cuándo y cuánto · Modo. */
function Zone({ title, lines = [], children }: { title: string; lines?: string[]; children: React.ReactNode }) {
  return (
    <div className="bg-foreground/[0.04] min-w-0 rounded-2xl px-4 py-3.5">
      <p className="text-muted-foreground text-xs font-medium">{title}</p>
      <p className="mt-1.5 flex min-w-0 items-center gap-2 text-[14.5px] font-semibold break-words">{children}</p>
      {lines.map((line) => (
        <p key={line} className="text-muted-foreground mt-[3px] text-[12.5px] text-pretty">
          {line}
        </p>
      ))}
    </div>
  );
}
