"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, Pause, Play, Plus, Rocket, Zap } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDateTime } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useAuth } from "@/shared/auth/auth.hooks";
import { BentoTile, StatePill } from "@/shared/components/features/bento";
import { EmptyState } from "@/shared/components/features/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { MarketingHeader } from "@/modules/marketing/ui/components/MarketingHeader";

import {
  funnelOf,
  RUN_STATUS_META,
  RUN_STEPS,
  scheduleLabel,
  sourceLabel,
  sourceSummary,
  stepsDone,
  type RoutineListItem,
} from "../domain/autopilot";
import {
  isAutopilotUnavailable,
  listRoutines,
  pauseRoutine,
  resumeRoutine,
  runRoutineNow,
} from "../infrastructure/autopilot-service.adapter";
import { PilotProposals } from "./proposals/PilotProposals";

/**
 * Marketing › Automatización (tablero 1 del lienzo P0): los pilotos del
 * negocio, cada uno en su tarjeta con tres zonas —qué busca, cuándo y cuánto,
 * y lo que trajo— y lo que está pasando AHORA si hay una ejecución en curso.
 *
 * Se refresca por los eventos `autopilot.*` de la sala de la empresa; la
 * lista es la verdad y se relee al empezar o terminar una ejecución.
 */
export function AutopilotListView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("leads:manage");
  const { showAlert } = useAlert();
  const [routines, setRoutines] = useState<RoutineListItem[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const routineNames = useMemo(
    () => new Map((routines ?? []).map((routine) => [routine.id, routine.name])),
    [routines],
  );

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
  useSocketEvent(socket, "autopilot.run_finished", () => load());
  useSocketEvent(socket, "autopilot.batch_ready", () => load());

  async function act(routine: RoutineListItem, action: "pause" | "resume" | "run") {
    setBusy(routine.id);
    try {
      if (action === "pause") await pauseRoutine(routine.id);
      else if (action === "resume") await resumeRoutine(routine.id);
      else await runRoutineNow(routine.id);
      showAlert({
        tone: "success",
        title:
          action === "pause" ? "Piloto pausado" : action === "resume" ? "Piloto reanudado" : "Ejecución en camino",
      });
      load();
    } catch (caught) {
      showAlert({ tone: "error", title: "No se pudo", description: errorMessage(caught) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <MarketingHeader
        title="Axi busca, califica y contacta por ti"
        description="Programa un piloto: a qué hora se ejecuta, cuántas cuentas trae y hasta cuántos créditos gasta. Cada ejecución queda en vivo, paso por paso, con lo que gastó y lo que trajo."
        actions={
          canManage && !unavailable ? (
            <Button asChild className="rounded-full">
              <Link href="/marketing/autopilot/new">
                <Plus aria-hidden className="size-4" />
                Nuevo piloto
              </Link>
            </Button>
          ) : undefined
        }
      />

      {unavailable ? (
        <EmptyState
          icon={Bot}
          title="El piloto llega con la próxima versión"
          description="Tu servidor todavía no trae el motor del piloto automático. En cuanto se actualice, aquí programas tus pilotos."
        />
      ) : error !== null ? (
        <EmptyState
          icon={Bot}
          title="No pudimos leer tus pilotos"
          description={error}
          action={<Button onClick={load}>Reintentar</Button>}
        />
      ) : routines === null ? (
        <div className="grid gap-4" role="status" aria-label="Cargando pilotos">
          <Skeleton className="h-56 w-full rounded-3xl" />
          <Skeleton className="h-56 w-full rounded-3xl" />
        </div>
      ) : routines.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="Tu primer piloto"
          description="Elige dónde buscar, a quién dejar pasar, cómo contactar y hasta cuánto gastar. Axi lo hace solo, en tu horario, y te avisa cuando alguien responde."
          action={
            canManage ? (
              <Button asChild>
                <Link href="/marketing/autopilot/new">Crear un piloto</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* P6b: «Axi propone», solo si hay algo que decidir */}
          <PilotProposals routineNames={routineNames} canManage={canManage} />
          <section className="flex flex-col gap-4" aria-label="Tus pilotos">
            {routines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                canManage={canManage}
                busy={busy === routine.id}
                onAct={(action) => void act(routine, action)}
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function RoutineCard({
  routine,
  canManage,
  busy,
  onAct,
}: {
  routine: RoutineListItem;
  canManage: boolean;
  busy: boolean;
  onAct: (action: "pause" | "resume" | "run") => void;
}) {
  const run = routine.last_run;
  const live = run !== null && (run.status === "running" || run.status === "queued");
  const waiting = run !== null && run.status === "awaiting_approval";
  const source = sourceLabel(routine.source.kind);
  const funnel = funnelOf(run?.counters ?? {});
  const pill =
    routine.status === "paused" ? (
      <StatePill tone="neutral">Pausado</StatePill>
    ) : live ? (
      <StatePill tone="info">
        En ejecución · paso {String(Math.min(stepsDone(run.step) + 1, RUN_STEPS.length))} de {String(RUN_STEPS.length)}
      </StatePill>
    ) : waiting ? (
      <StatePill tone="warning">Espera tu aprobación</StatePill>
    ) : (
      <StatePill tone="success">Programado</StatePill>
    );

  return (
    <BentoTile label={routine.mode === "assisted" ? "Piloto asistido" : "Piloto autónomo"} aside={pill} className="gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            href={`/marketing/autopilot/${routine.id}`}
            className="font-heading block min-h-6 truncate text-xl font-bold hover:underline"
          >
            {routine.name}
          </Link>
          <p className="text-muted-foreground text-sm text-pretty">
            {run === null
              ? "Todavía no se ha ejecutado."
              : `${RUN_STATUS_META[run.status].label} · ${formatShortDateTime(run.created_at)} · ${String(run.counters.contacted ?? 0)} contactados · ${String(run.credits_spent)} créditos`}
          </p>
        </div>
        {run !== null && (
          <Button asChild variant={live || waiting ? "default" : "outline"} size="sm" className="rounded-full">
            <Link href={`/marketing/autopilot/runs/${run.id}`}>
              {live ? "Ver en vivo" : waiting ? "Revisar el lote" : "Ver la ejecución"}
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-3 @container @[44rem]:grid-cols-3">
        <div className="bg-muted/40 flex min-w-0 flex-col gap-1.5 rounded-2xl p-4">
          <span className="text-muted-foreground text-xs font-semibold">Busca</span>
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <span aria-hidden className="bg-card grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold">
              {source.initial}
            </span>
            <span className="truncate">{source.label}</span>
          </span>
          <span className="text-muted-foreground text-xs text-pretty">{sourceSummary(routine.source.params)}</span>
        </div>
        <div className="bg-muted/40 flex min-w-0 flex-col gap-1.5 rounded-2xl p-4">
          <span className="text-muted-foreground text-xs font-semibold">Cuándo y cuánto</span>
          <span className="text-sm font-medium">{scheduleLabel(routine.schedule)}</span>
          <span className="text-muted-foreground text-xs text-pretty">
            {String(routine.schedule.leads_per_run)} cuentas y hasta {String(routine.budget.per_run)} créditos por ejecución
          </span>
          <span className="text-muted-foreground text-xs">
            Siguiente:{" "}
            {routine.status === "paused"
              ? "al reanudar"
              : routine.next_run_at === null
                ? "sin programar"
                : formatShortDateTime(routine.next_run_at)}
          </span>
        </div>
        <div className="bg-muted/40 flex min-w-0 flex-col gap-1.5 rounded-2xl p-4">
          <span className="text-muted-foreground text-xs font-semibold">Última ejecución</span>
          <dl className="grid grid-cols-3 gap-2">
            {funnel.map((step) => (
              <div key={step.key} className="flex min-w-0 flex-col">
                <dt className="text-muted-foreground order-2 text-xs">{step.label}</dt>
                <dd className="font-heading order-1 text-xl font-bold tabular-nums">{String(step.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          {routine.status === "paused" ? (
            <Button variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={() => onAct("resume")}>
              <Play aria-hidden className="size-4" />
              Reanudar
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={() => onAct("pause")}>
              <Pause aria-hidden className="size-4" />
              Pausar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            disabled={busy || live || routine.status === "paused"}
            onClick={() => onAct("run")}
          >
            <Zap aria-hidden className="size-4" />
            Ejecutar ahora
          </Button>
        </div>
      )}
    </BentoTile>
  );
}
