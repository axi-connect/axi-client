"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Pause, Pencil, Zap } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDateTime } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useAuth } from "@/shared/auth/auth.hooks";
import { BentoTile, InkIsland, StatePill } from "@/shared/components/features/bento";
import { EmptyState } from "@/shared/components/features/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { getTenantAgents } from "@/modules/agents/public";
import { listSequences } from "@/modules/crm/public";
import { MarketingHeader } from "@/modules/marketing/ui/components/MarketingHeader";

import {
  CONTACT_CHANNEL_OPTIONS,
  RUN_STATUS_META,
  scheduleLabel,
  sourceLabel,
  sourceSummary,
  type BatchItem,
  type Routine,
  type RunDetail,
  type RunEvent,
} from "../domain/autopilot";
import { eventLine, nextLine, nowLine } from "../domain/copy";
import { runTrajectory } from "../domain/trajectory";
import {
  getBatch,
  getRoutine,
  getRun,
  isAutopilotUnavailable,
  listRunEvents,
  pauseRoutine,
  runRoutineNow,
} from "../infrastructure/autopilot-service.adapter";
import { NowIsland } from "./recorrido/NowIsland";
import { RunAccounts } from "./recorrido/RunAccounts";
import { RunTrajectoryMap } from "./recorrido/RunTrajectoryMap";

/**
 * Una ejecución de un piloto, en vivo (upgrade «el recorrido», 2026-10-01).
 *
 * El recorrido de seis paradas (siete si es asistido) con cuántas cuentas pasan
 * por cada una y por dónde salió cada descartada; al lado, la isla «Ahora»
 * —qué hace el piloto y qué viene— que se convierte en el lote cuando la
 * ejecución espera tu aprobación. Debajo, las cuentas filtrables por etapa y la
 * bitácora. Se mueve con `autopilot.*` (sala de la empresa, filtrado por esta
 * ejecución) y la fila es la verdad: cada evento relee la ejecución.
 */
export function RunLiveView({ runId }: { runId: string }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("leads:manage");
  const { showAlert } = useAlert();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [batch, setBatch] = useState<BatchItem[] | null>(null);
  const [failure, setFailure] = useState<"unavailable" | string | null>(null);
  const [names, setNames] = useState<{ sequenceName: string | null; agentName: string | null }>({
    sequenceName: null,
    agentName: null,
  });

  const load = useCallback(async () => {
    try {
      const [detail, log] = await Promise.all([getRun(runId), listRunEvents(runId)]);
      setRun(detail);
      setEvents(log.items);
      if (detail.status === "awaiting_approval") setBatch((await getBatch(runId)).items);
      else setBatch(null);
      setFailure(null);
      return detail;
    } catch (caught) {
      setFailure(isAutopilotUnavailable(caught) ? "unavailable" : errorMessage(caught));
      return null;
    }
  }, [runId]);

  useEffect(() => {
    void load().then((detail) => {
      if (detail !== null) void getRoutine(detail.routine_id).then(setRoutine).catch(() => undefined);
    });
  }, [load]);

  // La secuencia y el agente, por su nombre: una lectura de cada lista, y si falla se dice sin nombre.
  const sequenceId = routine?.follow_up.sequence_id ?? null;
  const agentId = routine?.contact.agent_id ?? null;
  useEffect(() => {
    if (sequenceId === null) return;
    void Promise.all([listSequences().catch(() => null), agentId === null ? null : getTenantAgents().catch(() => null)]).then(
      ([sequences, agents]) =>
        setNames({
          sequenceName: sequences?.data.find((entry) => entry.id === sequenceId)?.name ?? null,
          agentName: agents?.find((entry) => entry.id === agentId)?.name ?? null,
        }),
    );
  }, [sequenceId, agentId]);

  const { socket } = useSocket("inbox");
  const mine = (payload: { run_id: string }) => payload.run_id === runId;
  // `item_moved` y el paso solo mueven la parada: se relee la ejecución y el avión viaja solo.
  useSocketEvent(socket, "autopilot.item_moved", (payload) => mine(payload) && void load());
  useSocketEvent(socket, "autopilot.credit_spent", (payload) => mine(payload) && void load());
  useSocketEvent(socket, "autopilot.batch_ready", (payload) => mine(payload) && void load());
  useSocketEvent(socket, "autopilot.run_finished", (payload) => mine(payload) && void load());

  if (failure === "unavailable") {
    return <EmptyState icon={Bot} title="El piloto llega con la próxima versión" description="Tu servidor todavía no trae el motor del piloto automático." />;
  }
  if (failure !== null) {
    return <EmptyState icon={Bot} title="No pudimos leer la ejecución" description={failure} action={<Button onClick={() => void load()}>Reintentar</Button>} />;
  }
  if (run === null) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Cargando la ejecución">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  const live = run.status === "running" || run.status === "queued";
  const waiting = run.status === "awaiting_approval";
  const status = RUN_STATUS_META[run.status];
  const channels = (routine?.contact.channels ?? []).map(
    (channel) => CONTACT_CHANNEL_OPTIONS.find((option) => option.value === channel)?.label ?? channel,
  );
  const trajectory = routine === null ? null : runTrajectory(run, routine);
  const source = routine === null ? null : sourceLabel(routine.source.kind);

  return (
    <div className="flex min-w-0 flex-col gap-6 pb-36">
      {/* pb-36: la isla fija no tapa la última tarjeta al llegar al pliegue. */}
      <MarketingHeader
        kicker="Marketing · Automatización · ejecución"
        title={routine?.name ?? "Ejecución del piloto"}
        description={
          routine === null
            ? undefined
            : `${scheduleLabel(routine.schedule)} · ${String(routine.schedule.leads_per_run)} cuentas por ejecución · tope ${String(routine.budget.per_run)} créditos`
        }
      />

      {/* La cabecera del mapa: cuándo arrancó, en qué modo y en qué estado va. */}
      <p className="text-muted-foreground -mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="tabular-nums">Ejecución · {formatShortDateTime(run.created_at)}</span>
        {routine !== null && <span>· {routine.mode === "assisted" ? "Asistido" : "Autónomo"}</span>}
        <StatePill tone={status.tone}>{status.label}</StatePill>
      </p>

      <div className="@container/live">
        <div className="grid gap-4 @[60rem]/live:grid-cols-[minmax(0,1fr)_22rem] @[60rem]/live:items-start">
          <div className="order-2 min-w-0 @[60rem]/live:order-none">
            {trajectory === null || source === null || routine === null ? (
              <Skeleton className="aspect-[860/420] w-full rounded-3xl" />
            ) : (
              <RunTrajectoryMap
                trajectory={trajectory}
                source={{ ...source, summary: sourceSummary(routine.source.params) }}
                flying={run.status === "running"}
              />
            )}
          </div>
          <div className="order-1 min-w-0 @[60rem]/live:order-none">
            <NowIsland
              run={run}
              routine={routine}
              now={routine === null ? { title: status.label, detail: run.error ?? "" } : nowLine(run, routine, names)}
              next={routine === null ? null : nextLine(run, routine)}
              batch={batch}
              channels={channels}
              sequenceName={names.sequenceName}
              canManage={canManage}
              onDecided={() => {
                showAlert({ tone: "success", title: "Lote decidido", description: "La ejecución sigue con lo que aprobaste." });
                void load();
              }}
            />
          </div>
        </div>
      </div>

      <div className="@container/below">
        <div className="grid gap-4 @[60rem]/below:grid-cols-[minmax(0,1fr)_22rem] @[60rem]/below:items-start">
          <RunAccounts items={run.items} routine={routine} />
      <BentoTile label="Bitácora de la ejecución">
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">Todavía no pasó nada.</p>
        ) : (
          <ol className="divide-border flex flex-col divide-y">
            {events.map((event) => (
              <li key={event.id} className="flex gap-3 py-2 text-sm">
                <span className="text-muted-foreground w-20 shrink-0 font-mono text-xs whitespace-nowrap tabular-nums">
                  {new Date(event.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="min-w-0 text-pretty">{eventLine(event, routine ?? undefined)}</span>
              </li>
            ))}
          </ol>
        )}
      </BentoTile>
        </div>
      </div>

      {canManage && routine !== null && (
        <InkIsland label="Acciones del piloto" className="sticky bottom-3 z-10 flex-row flex-wrap items-center gap-2 p-3 sm:rounded-full">
          {/* En el móvil el nombre ocupa su línea y los botones bajan: cortado a «Restau…» no decía nada. */}
          <span className="w-full min-w-0 pl-2 text-sm font-semibold text-pretty sm:w-auto sm:flex-1 sm:truncate" title={routine.name}>
            {routine.name}
          </span>
          <Button
            variant="contrast"
            size="sm"
            className="rounded-full"
            disabled={routine.status === "paused"}
            onClick={() =>
              void pauseRoutine(routine.id)
                .then(() => showAlert({ tone: "success", title: "Piloto pausado" }))
                .catch((caught: unknown) => showAlert({ tone: "error", title: "No se pudo pausar", description: errorMessage(caught) }))
            }
          >
            <Pause aria-hidden className="size-4" />
            Pausar
          </Button>
          <Button
            variant="contrast"
            size="sm"
            className="rounded-full"
            // Con el lote esperando aprobación, el servidor respondería 409: se dice antes.
            disabled={live || waiting || routine.status === "paused"}
            title={waiting ? "Aprueba primero el lote que espera" : undefined}
            onClick={() =>
              void runRoutineNow(routine.id)
                .then(() => showAlert({ tone: "success", title: "Ejecución en camino" }))
                .catch((caught: unknown) => showAlert({ tone: "error", title: "No se pudo ejecutar", description: errorMessage(caught) }))
            }
          >
            <Zap aria-hidden className="size-4" />
            Ejecutar ahora
          </Button>
          <Button asChild variant="contrast" size="sm" className="rounded-full">
            <Link href={`/marketing/autopilot/${routine.id}/edit`}>
              <Pencil aria-hidden className="size-4" />
              Editar
            </Link>
          </Button>
        </InkIsland>
      )}
    </div>
  );
}
