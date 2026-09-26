"use client";

import Link from "next/link";
import { CheckCircle2, ChevronLeft, Clock, Mic, PhoneCall, PhoneOff, Zap } from "lucide-react";
import { formatShortDate } from "@/core/lib/format";
import { StatePill } from "@/shared/components/features/bento";
import { FieldList, type FieldItem } from "@/shared/components/features/field-list";
import { Timeline, type TimelineItem } from "@/shared/components/features/timeline";
import { Button } from "@/shared/components/ui/button";
import {
  ANSWERED_BY_LABELS,
  CALL_PURPOSE_LABELS,
  CALL_STATUS_MAP,
  DIRECTION_LABELS,
  callResultPill,
  type CallSessionDetailDTO,
} from "@/modules/calls/domain/call";
import { formatCallClock, formatCallCost } from "@/modules/calls/ui/lib/call-format";
import { speakerFirstName } from "@/modules/calls/ui/live/live-phrase";
import { CallSummaryIsland } from "./CallSummaryIsland";
import { RecordingPanel } from "./RecordingPanel";
import { SyncedTranscript } from "./SyncedTranscript";
import { useSyncedRecording } from "./use-synced-recording";

const PANEL = "rounded-3xl border border-border bg-card p-5";

/**
 * La llamada terminada (llamadas premium F4, canvas tablero 6): la grabación
 * con su onda, la conversación sincronizada con ella, la isla «Así fue la
 * llamada» y los datos y eventos técnicos como listas.
 */
export function FinishedCallView({ call }: { call: CallSessionDetailDTO }) {
  const sync = useSyncedRecording(call);
  const outbound = call.direction === "outbound";
  const customerPhone = outbound ? call.to_number : call.from_number;
  const result = callResultPill(call);
  const names = {
    agent: speakerFirstName(call.ai_agent_name, "El agente"),
    caller: speakerFirstName(call.contact?.name, "Cliente"),
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <Link
            href="/calls/history"
            className="inline-flex w-fit items-center gap-1 rounded-md text-xs text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ChevronLeft aria-hidden className="size-3.5" />
            Historial
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl leading-none font-bold tracking-tight">
              {call.contact?.name ?? customerPhone}
            </h1>
            <StatePill tone={result.tone}>{result.label}</StatePill>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{customerPhone}</span>
            {" · "}
            {CALL_PURPOSE_LABELS[call.purpose]}
            {call.attempt > 1 ? ` · intento ${call.attempt}` : ""}
            {" · "}
            {DIRECTION_LABELS[call.direction].toLowerCase()}
            {" · "}
            {formatShortDate(call.created_at)}
          </p>
        </div>
        {call.contact !== null && (
          <Button asChild variant="outline">
            <Link href={`/crm/contacts/${call.contact.id}`}>Ver contacto</Link>
          </Button>
        )}
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          {sync.enabled && <RecordingPanel sync={sync} segments={call.segments} names={names} />}
          {/* En el celular el resumen va antes de la conversación, que puede ser larga. */}
          <CallSummaryIsland call={call} className="lg:hidden" />
          <SyncedTranscript
            segments={call.segments}
            events={call.events}
            windows={sync.enabled ? sync.windows : null}
            activeIndex={sync.activeIndex}
            positionMs={sync.playback.positionMs}
            playing={sync.playback.playing}
            onSeek={sync.enabled ? sync.playback.seek : null}
            names={names}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <CallSummaryIsland call={call} className="hidden lg:flex" />
          <section aria-label="Datos de la llamada" className={PANEL}>
            <h2 className="mb-3 text-sm font-semibold">Datos de la llamada</h2>
            <FieldList items={buildFields(call)} />
          </section>
          <section aria-label="Eventos técnicos" className={PANEL}>
            <h2 className="mb-3 text-sm font-semibold">Eventos técnicos</h2>
            <Timeline items={buildTechnicalTimeline(call)} />
          </section>
        </div>
      </div>
    </div>
  );
}

function buildFields(call: CallSessionDetailDTO): FieldItem[] {
  return [
    { label: "Agente", value: call.ai_agent_name },
    {
      label: "Número de origen",
      value: <span className="font-mono text-xs">{call.from_number}</span>,
      copyable: call.from_number,
    },
    {
      label: "Destino",
      value: <span className="font-mono text-xs">{call.to_number}</span>,
      copyable: call.to_number,
    },
    {
      label: "Duración",
      value:
        call.duration_seconds === null ? null : (
          <span className="font-mono tabular-nums">{formatCallClock(call.duration_seconds)}</span>
        ),
    },
    {
      label: "Contestó",
      value: call.answered_by === null ? null : ANSWERED_BY_LABELS[call.answered_by],
    },
    {
      label: "Grabación",
      value: call.has_recording
        ? call.recording_duration_seconds === null
          ? "Sí"
          : `Sí · ${formatCallClock(call.recording_duration_seconds)}`
        : "No",
    },
    {
      label: "Segundos medidos",
      value:
        call.metered_seconds === 0 ? null : (
          <span className="font-mono tabular-nums">{call.metered_seconds}</span>
        ),
    },
    {
      label: "Costo estimado",
      value:
        call.cost_estimate_usd === null ? null : (
          <span className="font-mono tabular-nums">{formatCallCost(call.cost_estimate_usd)}</span>
        ),
    },
  ];
}

/**
 * Línea técnica derivada de la sesión (los hitos no se persisten como
 * eventos propios): solicitud, respuesta con AMD, interrupciones,
 * abandono por guardas (`dispatch_abandoned`) y cierre.
 */
function buildTechnicalTimeline(call: CallSessionDetailDTO): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      id: "created",
      icon: Clock,
      tone: "neutral",
      title: "Solicitada",
      meta: timeOf(call.created_at),
    },
  ];

  for (const event of call.events) {
    if (event.type !== "dispatch_abandoned") continue;
    const reason = (event.payload as { reason?: unknown } | null)?.reason;
    items.push({
      id: `abandoned-${event.created_at}`,
      icon: PhoneOff,
      tone: "destructive",
      title: "Descartada por guardas",
      description: typeof reason === "string" ? reason : undefined,
      meta: timeOf(event.created_at),
    });
  }

  if (call.started_at !== null) {
    items.push({
      id: "answered",
      icon: PhoneCall,
      tone: "success",
      title: "Contestada",
      description: call.answered_by === null ? undefined : ANSWERED_BY_LABELS[call.answered_by],
      meta: timeOf(call.started_at),
    });
  }

  const interruptions = call.segments.filter(
    (segment) => segment.role === "agent" && segment.interrupted,
  ).length;
  if (interruptions > 0) {
    items.push({
      id: "interruptions",
      icon: Zap,
      tone: "violet",
      title:
        interruptions === 1
          ? "1 interrupción del cliente"
          : `${interruptions} interrupciones del cliente`,
      description: "El agente calló y cedió el turno (barge-in).",
    });
  }

  if (call.ended_at !== null) {
    const ended = CALL_STATUS_MAP[call.status];
    items.push({
      id: "ended",
      icon: call.status === "failed" ? PhoneOff : CheckCircle2,
      tone: call.status === "failed" ? "destructive" : "success",
      title: `Finalizada · ${ended?.label ?? call.status}`,
      meta: timeOf(call.ended_at),
    });
  }

  if (call.has_recording) {
    items.push({
      id: "recording",
      icon: Mic,
      tone: "violet",
      title: "Grabación archivada",
      description: "Descargada a nuestro almacenamiento y borrada del proveedor.",
    });
  }

  return items;
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
