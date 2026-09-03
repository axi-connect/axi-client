"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, LoaderCircle, Pause, Play } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { EmptyState } from "@/shared/components/features/empty-state";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Phone } from "lucide-react";
import { formatCallClock } from "@/modules/calls/ui/lib/call-format";
import {
  callResultBadge,
  CALL_PURPOSE_LABELS,
  DIRECTION_LABELS,
  type CallSessionRowDTO,
} from "@/modules/calls/domain/call";
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
 * audio y salta al detalle sin salir del chat.
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
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
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

  return (
    <ul className="space-y-2">
      {calls.map((call) => {
        const badge = callResultBadge(call);
        const outbound = call.direction === "outbound";
        const ArrowIcon = outbound ? ArrowUpRight : ArrowDownLeft;
        return (
          <li
            key={call.id}
            className="border-border bg-background flex items-center gap-2.5 rounded-lg border p-2.5"
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border",
                outbound
                  ? "border-accent-violet/40 bg-accent-violet/10 text-accent-violet"
                  : "border-info/40 bg-info/10 text-info",
              )}
              title={DIRECTION_LABELS[call.direction]}
            >
              <ArrowIcon className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={`/calls/${call.id}`}
                className="hover:text-brand block truncate text-xs font-medium transition-colors"
              >
                {CALL_PURPOSE_LABELS[call.purpose]}
                {call.duration_seconds !== null
                  ? ` · ${formatCallClock(call.duration_seconds)}`
                  : ""}
              </Link>
              <div className="mt-0.5">
                <StatusBadge status={badge.status} map={badge.map} />
              </div>
            </div>
            {call.has_recording && (
              <button
                type="button"
                onClick={() => void togglePlay(call)}
                className="border-input text-accent-violet hover:bg-accent flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors"
                aria-label={playingId === call.id ? "Pausar grabación" : "Reproducir grabación"}
              >
                {loadingId === call.id ? (
                  <LoaderCircle className="size-3 animate-spin" aria-hidden />
                ) : playingId === call.id ? (
                  <Pause className="size-3" aria-hidden />
                ) : (
                  <Play className="size-3 translate-x-px" aria-hidden />
                )}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
