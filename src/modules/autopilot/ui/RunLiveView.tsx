"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, CircleCheck, LoaderCircle, Pause, Pencil, Zap } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDateTime } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useAuth } from "@/shared/auth/auth.hooks";
import { BentoTile, InkIsland, StatePill } from "@/shared/components/features/bento";
import { EmptyState } from "@/shared/components/features/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { MarketingHeader } from "@/modules/marketing/ui/components/MarketingHeader";

import {
  eventLine,
  funnelOf,
  itemTitle,
  RUN_STAGE_LABELS,
  RUN_STAGES,
  RUN_STATUS_META,
  RUN_STEPS,
  scheduleLabel,
  stepsDone,
  type BatchItem,
  type Routine,
  type RunDetail,
  type RunEvent,
} from "../domain/autopilot";
import {
  decideBatch,
  getBatch,
  getRoutine,
  getRun,
  isAutopilotUnavailable,
  listRunEvents,
  pauseRoutine,
  runRoutineNow,
} from "../infrastructure/autopilot-service.adapter";

/** Etapas que se pintan como carriles, en el orden del recorrido. */
const LANES = RUN_STAGES.filter((stage) => stage !== "discarded");

/**
 * Una ejecución de un piloto, en vivo (tablero 3 del lienzo P0).
 *
 * Arriba, en qué paso va y qué lleva gastado; en medio, las cuentas en su
 * carril; abajo, la bitácora. Si el piloto es asistido y la ejecución espera,
 * el lote para aprobar ocupa el primer plano. Se mueve con `autopilot.*`
 * (sala de la empresa, filtrado por esta ejecución) y la fila es la verdad.
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

  const load = useCallback(async () => {
    try {
      const [detail, log] = await Promise.all([getRun(runId), listRunEvents(runId)]);
      setRun(detail);
      setEvents(log.items);
      setRoutine((current) => current ?? null);
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

  const { socket } = useSocket("inbox");
  const mine = (payload: { run_id: string }) => payload.run_id === runId;
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

  const status = RUN_STATUS_META[run.status];
  const done = stepsDone(run.step);
  const live = run.status === "running" || run.status === "queued";
  const waiting = run.status === "awaiting_approval";
  const current = RUN_STEPS[Math.min(done, RUN_STEPS.length - 1)];

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

      <div className="grid gap-4 @container @[52rem]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <BentoTile label="Ejecución" aside={<StatePill tone={status.tone}>{status.label}</StatePill>}>
          {/* La fecha va en su línea: junto al estado se cortaba en el móvil. */}
          <p className="text-muted-foreground text-xs tabular-nums">{formatShortDateTime(run.created_at)}</p>
          <p className="text-sm font-medium">
            {live
              ? `Paso ${String(Math.min(done + 1, RUN_STEPS.length))} de ${String(RUN_STEPS.length)} · ${current?.label ?? ""}`
              : run.status === "done"
                ? "Los seis pasos terminaron"
                : status.label}
          </p>
          <ol className="grid grid-cols-3 gap-2 @[36rem]:grid-cols-6" aria-label="Pasos">
            {RUN_STEPS.map((step, index) => {
              const finished = index < done;
              const active = live && index === done;
              // El paso que sigue al lote por aprobar no está vacío: está esperando.
              const blocked = waiting && index === done;
              return (
                <li key={step.key} className="flex min-w-0 flex-col gap-1.5">
                  <span
                    aria-hidden
                    className={cn(
                      "h-1.5 rounded-full",
                      finished ? "bg-success" : active ? "bg-accent-violet animate-pulse motion-reduce:animate-none" : "bg-muted",
                    )}
                  />
                  <span className={cn("text-xs", finished || active ? "font-medium" : "text-muted-foreground")}>
                    {step.label}
                  </span>
                  {blocked && <span className="text-muted-foreground text-[11px] text-pretty">Espera tu aprobación</span>}
                </li>
              );
            })}
          </ol>
          <dl className="grid grid-cols-3 gap-3">
            {funnelOf(run.counters).map((entry) => (
              <div key={entry.key} className="flex flex-col">
                <dt className="text-muted-foreground order-2 text-xs">{entry.label}</dt>
                <dd className="font-heading order-1 text-2xl font-bold tabular-nums">{String(entry.value)}</dd>
              </div>
            ))}
          </dl>
          {run.error !== null && <p className="text-destructive text-sm text-pretty">{run.error}</p>}
        </BentoTile>

        <BentoTile
          label="Créditos de esta ejecución"
          aside={
            routine !== null && run.credits_spent >= routine.budget.per_run ? (
              <StatePill tone="warning">Llegó al tope</StatePill>
            ) : (
              <StatePill tone="success">Dentro del tope</StatePill>
            )
          }
        >
          <p className="flex items-baseline gap-2">
            <span className="font-heading text-4xl font-bold tabular-nums">{String(run.credits_spent)}</span>
            <span className="text-muted-foreground text-sm">
              {routine === null ? "créditos" : `de ${String(routine.budget.per_run)} · ${String(Math.max(0, routine.budget.per_run - run.credits_spent))} de reserva`}
            </span>
          </p>
          <p className="text-muted-foreground text-xs text-pretty">
            Solo cuesta revelar: 1 crédito el correo y 8 el celular, de tu saldo en Apollo y solo si lo encuentra.
          </p>
        </BentoTile>
      </div>

      {batch !== null && (
        <BatchPanel
          runId={runId}
          items={batch}
          canManage={canManage}
          onDecided={() => {
            showAlert({ tone: "success", title: "Lote decidido", description: "La ejecución sigue con lo que aprobaste." });
            void load();
          }}
        />
      )}

      <section aria-label="Cuentas por etapa" className="axi-scroll -mx-1 overflow-x-auto px-1 pb-2">
        <div className="grid min-w-[56rem] grid-cols-7 gap-3">
          {LANES.map((stage) => {
            const items = run.items.filter((item) => item.stage === stage);
            return (
              <div key={stage} className="border-border bg-card flex min-w-0 flex-col gap-2 rounded-2xl border p-3">
                <header className="flex items-baseline justify-between gap-2">
                  <h3 className="text-xs font-semibold">{RUN_STAGE_LABELS[stage]}</h3>
                  <span className="text-muted-foreground text-xs tabular-nums">{String(items.length)}</span>
                </header>
                <ul className="flex flex-col gap-1.5">
                  {items.slice(0, 8).map((item) => (
                    <li key={item.id} className="bg-muted/40 rounded-xl px-2.5 py-2 text-xs">
                      <span className="block truncate font-medium" title={itemTitle(item)}>
                        {itemTitle(item)}
                      </span>
                      <span className="text-muted-foreground block truncate">
                        {item.score === null ? "" : `Puntaje ${String(item.score)}`}
                        {item.reason === null ? "" : `${item.score === null ? "" : " · "}${item.reason}`}
                      </span>
                    </li>
                  ))}
                  {items.length > 8 && (
                    <li className="text-muted-foreground px-1 text-xs">+ {String(items.length - 8)} más</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

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
                <span className="min-w-0 text-pretty">{eventLine(event)}</span>
              </li>
            ))}
          </ol>
        )}
      </BentoTile>

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

/**
 * El lote de un piloto ASISTIDO: la ejecución se detuvo antes de contactar y
 * espera a que el dueño apruebe a quién. Lo que no se aprueba se omite.
 */
function BatchPanel({
  runId,
  items,
  canManage,
  onDecided,
}: {
  runId: string;
  items: BatchItem[];
  canManage: boolean;
  onDecided: () => void;
}) {
  const { showAlert } = useAlert();
  const [approved, setApproved] = useState<ReadonlySet<string>>(() => new Set(items.map((item) => item.id)));
  const [sending, setSending] = useState(false);
  const skipped = useMemo(() => items.filter((item) => !approved.has(item.id)).map((item) => item.id), [items, approved]);

  async function decide() {
    setSending(true);
    try {
      await decideBatch(runId, { approve: [...approved], skip: skipped });
      onDecided();
    } catch (caught) {
      showAlert({ tone: "error", title: "No se guardó la decisión", description: errorMessage(caught) });
    } finally {
      setSending(false);
    }
  }

  return (
    <BentoTile
      label="El lote espera tu aprobación"
      aside={<StatePill tone="warning">{String(items.length)} cuentas</StatePill>}
      className="border-warning/40"
    >
      <p className="text-muted-foreground text-sm text-pretty">
        Axi calificó estas cuentas y pasó la política de contacto. Quita las que no quieras y aprueba: las demás se
        inscriben en la secuencia.
      </p>
      <ul className="divide-border divide-y">
        {items.map((item) => (
          <li key={item.id}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2 text-sm">
              <Checkbox
                checked={approved.has(item.id)}
                disabled={!canManage}
                aria-label={`Aprobar ${itemTitle(item)}`}
                onChange={(event) =>
                  setApproved((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(item.id);
                    else next.delete(item.id);
                    return next;
                  })
                }
              />
              {/* Aprobar exige leer a quién: el nombre va completo, no cortado. */}
              <span className="min-w-0 flex-1 font-medium text-pretty break-words">{itemTitle(item)}</span>
              {item.score !== null && <span className="text-muted-foreground text-xs tabular-nums">Puntaje {String(item.score)}</span>}
            </label>
          </li>
        ))}
      </ul>
      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <Button className="rounded-full" disabled={sending} onClick={() => void decide()}>
            {sending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <CircleCheck aria-hidden className="size-4" />}
            Aprobar {String(approved.size)} y contactar
          </Button>
          <span className="text-muted-foreground text-xs">{String(skipped.length)} se omiten</span>
        </div>
      )}
    </BentoTile>
  );
}
