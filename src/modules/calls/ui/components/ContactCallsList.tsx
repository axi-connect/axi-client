"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, LoaderCircle, Pause, Play } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { EmptyState } from "@/shared/components/features/empty-state";
import { StatePill } from "@/shared/components/features/bento";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Phone } from "lucide-react";
import { formatCallClock } from "@/modules/calls/ui/lib/call-format";
import {
  callResultPill,
  CALL_PURPOSE_LABELS,
  CALL_STATUS_MAP,
  DIRECTION_LABELS,
  isLiveCallStatus,
  type CallSessionRowDTO,
} from "@/modules/calls/domain/call";
import { useLiveCallPreview } from "@/modules/calls/infrastructure/realtime/use-live-call-preview";
import { CallAura } from "@/modules/calls/ui/components/aura/CallAura";
import { speakerFirstName, whoLabel } from "@/modules/calls/ui/live/live-phrase";
import {
  getCallRecordingUrl,
  listCallSessions,
} from "@/modules/calls/infrastructure/services/calls-service.adapter";

const LIMIT = 5;

// Un solo <audio> para todo el panel (patrón VoiceSelector): darle play a una
// grabación detiene la anterior.
let sharedAudio: HTMLAudioElement | null = null;

/**
 * Últimas llamadas de UN contacto — la vista compacta que consume el rail de
 * contexto del inbox (vía `modules/calls/public`). El operador escucha el
 * audio y salta al detalle sin salir del chat. Premium F5 (canvas, tablero
 * 5): la llamada en curso manda arriba con su aura; las demás, como lista.
 *
 * `version` la incrementan los eventos WS del contacto: subir de versión
 * re-consulta (mismo contrato que ContactTimelineFeed).
 */
export function ContactCallsList({
  contactId,
  version = 0,
}: {
  contactId: string;
  version?: number;
}) {
  const [calls, setCalls] = useState<CallSessionRowDTO[] | null>(null);
  const [error, setError] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sharedAudio?.pause();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    listCallSessions({ contact_id: contactId, page: 1, page_size: LIMIT })
      .then((page) => {
        if (!cancelled) setCalls(page.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [contactId, version]);

  const togglePlay = async (call: CallSessionRowDTO) => {
    if (playingId === call.id) {
      sharedAudio?.pause();
      setPlayingId(null);
      return;
    }
    sharedAudio?.pause();
    setLoadingId(call.id);
    try {
      const { url } = await getCallRecordingUrl(call.id);
      if (!mountedRef.current) return;
      sharedAudio = new Audio(url);
      sharedAudio.onended = () => setPlayingId(null);
      sharedAudio.onpause = () => setPlayingId((current) => (current === call.id ? null : current));
      await sharedAudio.play();
      setPlayingId(call.id);
    } catch {
      setPlayingId(null);
    } finally {
      if (mountedRef.current) setLoadingId(null);
    }
  };

  if (error) {
    return (
      <p className="text-muted-foreground p-2 text-xs" role="alert">
        No se pudieron cargar las llamadas.
      </p>
    );
  }
  if (calls === null) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    );
  }
  if (calls.length === 0) {
    return (
      <EmptyState
        icon={Phone}
        accent="violet"
        title="Sin llamadas todavía"
        description="Cuando el agente hable por teléfono con este contacto, las verás aquí."
      />
    );
  }

  const [first, ...rest] = calls;
  const liveCall = first !== undefined && isLiveCallStatus(first.status) ? first : null;
  const finished = liveCall === null ? calls : rest;

  return (
    <div className="flex flex-col gap-3">
      {liveCall !== null && <LiveCallBanner call={liveCall} />}
      {finished.length > 0 && (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card px-3">
          {finished.map((call) => {
            const result = callResultPill(call);
            const playing = playingId === call.id;
            return (
              <li key={call.id} className="flex items-center gap-3 py-3">
                {call.has_recording ? (
                  <button
                    type="button"
                    onClick={() => void togglePlay(call)}
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      playing ? "bg-foreground text-background" : "bg-muted hover:bg-muted/70",
                    )}
                    aria-label={`${playing ? "Pausar" : "Escuchar"} la grabación: ${CALL_PURPOSE_LABELS[call.purpose]}`}
                  >
                    {loadingId === call.id ? (
                      <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
                    ) : playing ? (
                      <Pause className="size-3.5" aria-hidden />
                    ) : (
                      <Play className="size-3.5 translate-x-px" aria-hidden />
                    )}
                  </button>
                ) : (
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                    title={`${DIRECTION_LABELS[call.direction]} · sin grabación`}
                  >
                    {call.direction === "outbound" ? (
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    ) : (
                      <ArrowDownLeft className="size-3.5" aria-hidden />
                    )}
                    <span className="sr-only">{DIRECTION_LABELS[call.direction]}, sin grabación</span>
                  </span>
                )}
                <Link
                  href={`/calls/${call.id}`}
                  className="flex min-w-0 flex-1 flex-col gap-1 rounded-md focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="truncate text-[13px] font-semibold underline-offset-4 hover:underline">
                    {CALL_PURPOSE_LABELS[call.purpose]}
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <StatePill tone={result.tone}>{result.label}</StatePill>
                    <span className="truncate text-xs text-muted-foreground">
                      <RelativeDate iso={call.created_at} />
                      {call.duration_seconds !== null && call.duration_seconds > 0
                        ? ` · ${formatCallClock(call.duration_seconds)}`
                        : ""}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** La llamada en curso de este contacto, arriba y con su aura (canvas, tablero 5). */
function LiveCallBanner({ call }: { call: CallSessionRowDTO }) {
  const { mode } = useLiveCallPreview(call);
  const names = {
    agent: speakerFirstName(call.ai_agent_name, "el agente"),
    caller: speakerFirstName(call.contact?.name, "el cliente"),
  };
  return (
    <Link
      href={`/calls/${call.id}`}
      className="surface-dark relative isolate flex min-h-24 items-center gap-3 overflow-hidden rounded-2xl bg-background p-3.5 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span aria-hidden className="absolute inset-0 -z-10 opacity-90">
        <CallAura mode={mode} size="mini" options={{ scale: 0.9, squash: 0.35 }} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className="size-1.5 rounded-full bg-success" />
          {CALL_STATUS_MAP[call.status]?.label ?? "En curso"}
        </span>
        <span className="truncate text-sm font-semibold">{CALL_PURPOSE_LABELS[call.purpose]}</span>
        <span className="truncate text-xs text-muted-foreground">{whoLabel(mode, names, call.status !== "in_progress")}</span>
      </span>
      <span className="inline-flex h-9 shrink-0 items-center rounded-full bg-foreground/[0.08] px-3 text-xs font-medium ring-1 ring-foreground/10">
        Ver en vivo
      </span>
    </Link>
  );
}
