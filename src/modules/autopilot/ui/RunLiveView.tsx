"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useAuth } from "@/shared/auth/auth.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { getTenantAgents } from "@/modules/agents/public";
import { listSequences } from "@/modules/crm/public";
import { MarketingHeader } from "@/modules/marketing/ui/components/MarketingHeader";

import {
  ROUTINE_MODE_META,
  RUN_STATUS_META,
  scheduleLabel,
  sourceLabel,
  sourceSummary,
  type BatchItem,
  type Routine,
  type RunDetail,
  type RunEvent,
} from "../domain/autopilot";
import { failureLine, nextLine, nowLine } from "../domain/copy";
import { runTrajectory, type StopKey } from "../domain/trajectory";
import {
  getBatch,
  getRoutine,
  getRun,
  isAutopilotUnavailable,
  listRunEvents,
  runRoutineNow,
} from "../infrastructure/autopilot-service.adapter";
import { ActionCapsule } from "./recorrido/ActionCapsule";
import { BatchIsland } from "./recorrido/BatchIsland";
import { RunAccounts } from "./recorrido/RunAccounts";
import { RunTrajectoryMap } from "./recorrido/RunTrajectoryMap";
import { departureLabel, whenLabel } from "./recorrido/when";

/**
 * Una salida de una ruta, en vivo (Rutas de captación, R1, mockup aprobado el
 * 2026-10-01).
 *
 * Arriba, el encabezado con la cápsula de acciones (Pausar ↔ Reanudar · Salir
 * ahora · Editar). Luego la tarjeta de la ruta a todo el ancho: la frase de
 * ahora en grande, el mapa y su pie. Debajo, si hay un lote, la isla «Tu
 * aprobación» junto a las cuentas; si no, las cuentas a todo el ancho. Se
 * mueve con `autopilot.*` (sala de la empresa, filtrado por esta salida) y la
 * fila es la verdad: cada evento relee la salida.
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
  const [selected, setSelected] = useState<StopKey | null>(null);
  const [names, setNames] = useState<{ sequenceName: string | null; agentName: string | null }>({ sequenceName: null, agentName: null });

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

  const loadRoutine = useCallback((routineId: string) => {
    void getRoutine(routineId)
      .then(setRoutine)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void load().then((detail) => {
      if (detail !== null) loadRoutine(detail.routine_id);
    });
  }, [load, loadRoutine]);

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
  // `item_moved` y el paso solo mueven la parada: se relee la salida y Axi viaja solo.
  useSocketEvent(socket, "autopilot.item_moved", (payload) => mine(payload) && void load());
  useSocketEvent(socket, "autopilot.credit_spent", (payload) => mine(payload) && void load());
  useSocketEvent(socket, "autopilot.batch_ready", (payload) => mine(payload) && void load());
  useSocketEvent(socket, "autopilot.run_finished", (payload) => mine(payload) && void load());

  if (failure === "unavailable") {
    return <EmptyState icon={Bot} title="Las rutas llegan con la próxima versión" description="Tu servidor todavía no trae el motor de las rutas de captación." />;
  }
  if (failure !== null) {
    return <EmptyState icon={Bot} title="No pudimos leer la salida" description={failure} action={<Button onClick={() => void load()}>Reintentar</Button>} />;
  }
  if (run === null) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Cargando la salida">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  const status = RUN_STATUS_META[run.status];
  const waiting = run.status === "awaiting_approval" && batch !== null;
  const timeZone = routine?.schedule.timezone ?? "America/Bogota";
  const trajectory =
    routine === null ? null : runTrajectory(run, routine, { sequenceName: names.sequenceName, events });
  const source = routine === null ? null : { ...sourceLabel(routine.source.kind), summary: sourceSummary(routine.source.params) };
  const now =
    routine === null
      ? { title: status.label, detail: run.status === "failed" ? failureLine(run, null) : "" }
      : nowLine(run, routine, names);
  const reload = () => {
    void load();
    if (routine !== null) loadRoutine(routine.id);
  };

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <MarketingHeader
        kicker="Marketing · Rutas · salida"
        title={routine?.name ?? "Salida de la ruta"}
        description={
          routine === null
            ? undefined
            : `${scheduleLabel(routine.schedule)} · ${String(routine.schedule.leads_per_run)} cuentas por salida · tope de ${String(routine.budget.per_run)} créditos`
        }
        actions={
          canManage && routine !== null ? <ActionCapsule routine={routine} lastRun={run.status} onChanged={reload} /> : undefined
        }
      />

      {trajectory === null || routine === null ? (
        <Skeleton className="h-96 w-full rounded-3xl" />
      ) : (
        <RunTrajectoryMap
          trajectory={trajectory}
          running={run.status === "running"}
          paused={run.status === "paused"}
          status={{ label: status.label, tone: status.tone, live: run.status === "running" }}
          startedLabel={departureLabel(run.started_at ?? run.created_at, timeZone)}
          modeLabel={ROUTINE_MODE_META[routine.mode].label}
          now={now}
          failed={run.status === "failed"}
          source={source}
          credits={{ spent: run.credits_spent, cap: routine.budget.per_run }}
          next={nextLine(run, routine)}
          nextDeparture={routine.status === "paused" || routine.next_run_at === null ? null : whenLabel(routine.next_run_at, timeZone)}
          agentName={names.agentName}
          maxFlow={Math.max(routine.schedule.leads_per_run, ...trajectory.stops.map((stop) => stop.count ?? 0))}
          selected={selected}
          onSelect={(key) => setSelected((current) => (current === key ? null : key))}
          onRetry={
            canManage
              ? () =>
                  void runRoutineNow(routine.id)
                    .then(() => {
                      showAlert({ tone: "success", title: "Sale en un momento" });
                      reload();
                    })
                    .catch((caught: unknown) => showAlert({ tone: "error", title: "No se pudo salir", description: errorMessage(caught) }))
              : undefined
          }
        />
      )}

      <div className="@container/below">
        <div className={waiting ? "grid gap-4 @[56rem]/below:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] @[56rem]/below:items-start" : "grid gap-4"}>
          {waiting && (
            <BatchIsland
              key={run.id}
              runId={run.id}
              items={batch}
              routine={routine}
              sequenceName={names.sequenceName}
              canManage={canManage}
              onDecided={() => {
                showAlert({ tone: "success", title: "Lote decidido", description: "La salida sigue con lo que aprobaste." });
                void load();
              }}
            />
          )}
          <RunAccounts
            items={run.items}
            routine={routine}
            stops={trajectory?.stops ?? []}
            events={events}
            waiting={waiting}
            batchSize={batch?.length ?? 0}
            selectedStop={selected}
            onClearStop={() => setSelected(null)}
            failed={run.status === "failed"}
          />
        </div>
      </div>
    </div>
  );
}
