"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Mic,
  PhoneCall,
  PhoneOff,
  Zap,
} from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDate } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import { AudioPlayerCore } from "@/shared/components/features/audio-player";
import { FieldList, type FieldItem } from "@/shared/components/features/field-list";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { Timeline, type TimelineItem } from "@/shared/components/features/timeline";
import { BrandLoader } from "@/shared/components/ui/brand-loader";
import { Button } from "@/shared/components/ui/button";
import {
  ANSWERED_BY_LABELS,
  callResultBadge,
  CALL_PURPOSE_LABELS,
  CALL_STATUS_MAP,
  DIRECTION_LABELS,
  isLiveCallStatus,
  type CallSessionDetailDTO,
} from "@/modules/calls/domain/call";
import { useRecordingUrl } from "@/modules/calls/infrastructure/hooks/use-recording-url";
import { useLiveCall } from "@/modules/calls/infrastructure/realtime/use-live-call";
import { getCallSession } from "@/modules/calls/infrastructure/services/calls-service.adapter";
import { CallTranscript } from "@/modules/calls/ui/components/CallTranscript";
import { formatCallClock, formatCallCost } from "@/modules/calls/ui/lib/call-format";

const CARD = "border-border shadow-float bg-background rounded-lg border p-5";

/** Detalle de una llamada: grabación, resumen, transcript con latencias y
 * rail técnico. Molde de layout: LeadDetailView de prospecting. */
export function CallDetailView({ callId }: { callId: string }) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [call, setCall] = useState<CallSessionDetailDTO | null>(null);

  // Solo la carga INICIAL expulsa al historial (la llamada no existe o no es
  // nuestra). Un re-fetch por evento del WS que falle (401 de rotación, 429,
  // red) avisa y conserva la pantalla — antes sacaba al usuario a mitad de
  // una llamada en vivo.
  const load = useCallback(
    (options: { initial: boolean } = { initial: false }) => {
      getCallSession(callId)
        .then(setCall)
        .catch((error: unknown) => {
          showAlert({ tone: "error", title: errorMessage(error), open: true });
          if (options.initial) router.replace("/calls/history");
        });
    },
    [callId, router, showAlert],
  );

  useEffect(() => {
    load({ initial: true });
  }, [load]);

  // Transcript en vivo (F4-C): mientras la llamada siga viva, el room
  // `call_…` inserta los segmentos y cualquier cambio de estado re-consulta.
  const live = call !== null && isLiveCallStatus(call.status);
  useLiveCall({
    callSessionId: callId,
    enabled: live,
    onSegment: (segment) => {
      setCall((prev) => {
        if (prev === null) return prev;
        if (prev.segments.some((existing) => existing.seq === segment.seq)) return prev;
        const next = [
          ...prev.segments,
          {
            seq: segment.seq,
            role: segment.role,
            text: segment.text,
            at_ms: segment.at_ms,
            interrupted: false,
          },
        ].sort((a, b) => a.seq - b.seq);
        return { ...prev, segments: next };
      });
    },
    onChanged: () => load(),
  });

  if (call === null) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <BrandLoader label="Cargando la llamada" />
      </div>
    );
  }

  const badge = callResultBadge(call);
  const outbound = call.direction === "outbound";
  const DirectionIcon = outbound ? ArrowUpRight : ArrowDownLeft;
  const customerPhone = outbound ? call.to_number : call.from_number;

  return (
    <div className="p-4 md:p-6">
      <Button
        variant="outline"
        size="sm"
        className="mb-4"
        onClick={() => router.push("/calls/history")}
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver al historial
      </Button>

      <header className="mb-5 flex flex-wrap items-start gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold">
            {call.contact?.name ?? customerPhone}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={badge.status} map={badge.map} />
            <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-xs">
              {CALL_PURPOSE_LABELS[call.purpose]}
            </span>
            <span className="border-border text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs">
              <DirectionIcon className="size-3" aria-hidden />
              {DIRECTION_LABELS[call.direction]}
            </span>
            {call.cost_estimate_usd !== null && (
              <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 font-mono text-xs tabular-nums">
                {formatCallCost(call.cost_estimate_usd)}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            <span className="font-mono">{customerPhone}</span>
            {" · "}
            {formatShortDate(call.created_at)}
            {call.attempt > 1 ? ` · intento ${call.attempt}` : ""}
          </p>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col gap-5">
          {call.has_recording && <RecordingCard callId={call.id} />}

          {call.summary !== null && (
            <section className={`${CARD} border-l-accent-violet border-l-2`}>
              <h2 className="text-accent-violet text-xs font-semibold tracking-wide uppercase">
                Resumen de la llamada
              </h2>
              <p className="mt-2 text-sm leading-relaxed">{call.summary}</p>
            </section>
          )}

          <section className={CARD}>
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                Transcript
                {live && (
                  <span className="bg-success/10 text-success inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium">
                    <span className="bg-success size-1.5 animate-pulse rounded-full" aria-hidden />
                    En vivo
                  </span>
                )}
              </h2>
              <p className="text-muted-foreground text-xs">
                latencia por turno · toca el badge para ver el desglose
              </p>
            </div>
            {call.segments.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {live
                  ? "Esperando la conversación…"
                  : "Esta llamada no tiene transcript (no hubo conversación con la IA)."}
              </p>
            ) : (
              <CallTranscript
                segments={call.segments}
                events={call.events}
                agentName={call.ai_agent_name}
                contactName={call.contact?.name ?? null}
              />
            )}
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className={CARD}>
            <h2 className="mb-3 text-sm font-semibold">Datos de la llamada</h2>
            <FieldList items={buildFields(call)} />
          </section>

          <section className={CARD}>
            <h2 className="mb-3 text-sm font-semibold">Eventos técnicos</h2>
            <Timeline items={buildTechnicalTimeline(call)} />
          </section>
        </div>
      </div>
    </div>
  );
}

/** La URL firmada se pide en el PRIMER play (TTL 300 s), no al abrir. */
function RecordingCard({ callId }: { callId: string }) {
  const { url, status, load } = useRecordingUrl(callId);
  return (
    <section className={`${CARD} flex items-center gap-3`}>
      <AudioPlayerCore
        src={url}
        loading={status === "loading"}
        error={status === "error"}
        onNeedSrc={load}
        className="w-full"
      />
      {status === "error" && (
        <p className="text-destructive text-xs">No se pudo cargar la grabación.</p>
      )}
    </section>
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
