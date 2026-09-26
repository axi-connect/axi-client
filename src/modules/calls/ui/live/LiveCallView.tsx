"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BentoTile, StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import {
  CALL_PURPOSE_LABELS,
  CALL_STATUS_MAP,
  DIRECTION_LABELS,
  type CallSessionDetailDTO,
} from "@/modules/calls/domain/call";
import { auraModeFor, type LiveCallPulse } from "@/modules/calls/domain/live-call";
import { formatCallClock } from "@/modules/calls/ui/lib/call-format";
import { LiveCallStage } from "./LiveCallStage";
import { LiveConversation } from "./LiveConversation";
import { speakerFirstName, stagePhrase, whoLabel } from "./live-phrase";

/** Segundos desde `startedAt`, al segundo. Un solo intervalo por vista. */
function useElapsedSeconds(startedAt: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  if (startedAt === null) return null;
  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
}

/**
 * La llamada en vivo (llamadas premium F3, canvas tablero 3): el escenario de
 * tinta con el aura y la frase que se está diciendo, tres fichas de contexto y
 * la conversación entrando a la derecha. Recibe el detalle y el pulso ya
 * vivos: la suscripción y la carga las hace `CallDetailView`.
 */
export function LiveCallView({
  call,
  pulse,
}: {
  call: CallSessionDetailDTO;
  pulse: LiveCallPulse;
}) {
  const outbound = call.direction === "outbound";
  const customerPhone = outbound ? call.to_number : call.from_number;
  const ourLine = outbound ? call.from_number : call.to_number;
  const ringing = call.status !== "in_progress";
  const elapsed = useElapsedSeconds(ringing ? null : call.started_at);

  const agentName = call.ai_agent_name ?? "El agente";
  const names = {
    agent: speakerFirstName(call.ai_agent_name, "el agente"),
    caller: speakerFirstName(call.contact?.name, "el cliente"),
  };
  const mode = ringing ? "idle" : auraModeFor(pulse);
  const phrase = ringing ? null : stagePhrase(call.segments, pulse, mode);
  const status = CALL_STATUS_MAP[call.status];
  const clock = elapsed === null ? null : formatCallClock(elapsed);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <Link
            href="/calls"
            className="inline-flex w-fit items-center gap-1 rounded-md text-xs text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ChevronLeft aria-hidden className="size-3.5" />
            Monitoreo
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl leading-none font-bold tracking-tight">
              {call.contact?.name ?? customerPhone}
            </h1>
            <StatePill tone={ringing ? "neutral" : "success"}>{status?.label ?? "En curso"}</StatePill>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{customerPhone}</span>
            {" · "}
            {CALL_PURPOSE_LABELS[call.purpose]}
            {call.attempt > 1 ? ` · intento ${call.attempt}` : ""}
            {" · "}
            {DIRECTION_LABELS[call.direction].toLowerCase()}
          </p>
        </div>
        {call.contact !== null && (
          <Button asChild variant="outline">
            <Link href={`/crm/contacts/${call.contact.id}`}>Ver contacto</Link>
          </Button>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-4">
          <LiveCallStage
            mode={mode}
            who={whoLabel(mode, names, ringing)}
            phrase={phrase}
            clock={clock ?? status?.label ?? "Marcando"}
            ticking={clock !== null}
            agentName={agentName}
            names={names}
            className="lg:min-h-[600px] lg:flex-1"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <BentoTile label="Motivo">
              <p className="truncate text-sm font-semibold">{CALL_PURPOSE_LABELS[call.purpose]}</p>
              <p className="truncate text-xs text-muted-foreground">
                {call.attempt > 1 ? `intento ${call.attempt}` : "primer intento"}
              </p>
            </BentoTile>
            <BentoTile label="Número">
              <p className="truncate font-mono text-sm">{ourLine}</p>
              <p className="truncate text-xs text-muted-foreground">tu línea de llamadas</p>
            </BentoTile>
            <BentoTile label="Minutos">
              <p className="truncate text-sm font-semibold tabular-nums">
                {clock === null ? "Aún no contesta" : `${clock} en esta llamada`}
              </p>
              <p className="truncate text-xs text-muted-foreground">se mide por minuto hablado</p>
            </BentoTile>
          </div>
        </div>

        <LiveConversation
          segments={call.segments}
          draft={pulse.draft?.text ?? null}
          names={names}
          className="max-h-[520px] lg:max-h-none lg:[contain:size]"
        />
      </div>
    </div>
  );
}
