"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Route } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { BentoTile, StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import {
  CALL_PURPOSE_LABELS,
  CALL_STATUS_MAP,
  DIRECTION_LABELS,
  MODE_LABELS,
  type CallSessionDetailDTO,
} from "@/modules/calls/domain/call";
import {
  auraModeFor,
  currentStage,
  routeSteps,
  stageMarks,
  type LiveCallPulse,
} from "@/modules/calls/domain/live-call";
import { callTypeLabel } from "@/modules/calls/domain/playbooks";
import { StageRoute } from "@/modules/calls/ui/components/StageRoute";
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

  // Plan de modos §4: en una proactiva, el marco y la etapa en la que va.
  const stages = call.playbook?.stages ?? [];
  const stageKey = call.playbook === null ? null : currentStage(pulse, call.stage_route);
  const steps = routeSteps(stages, stageKey);
  const stageIndex = stages.findIndex((stage) => stage.key === stageKey);
  const stageNow = stageIndex === -1 ? null : stages[stageIndex];
  const stageText =
    stageNow === undefined || stageNow === null
      ? null
      : `${stageNow.label} · ${String(stageIndex + 1)} de ${String(stages.length)}`;
  const pending = stages.slice(stageIndex + 1).map((stage) => stage.label.toLowerCase());

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
            {" · "}
            {MODE_LABELS[call.mode].toLowerCase()}
          </p>
        </div>
        {call.contact !== null && (
          <Button asChild variant="outline">
            <Link href={`/crm/contacts/${call.contact.id}`}>Ver contacto</Link>
          </Button>
        )}
      </header>

      {steps.length > 0 && <StageRoute steps={steps} />}

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
            stage={ringing ? null : stageText}
            className="lg:min-h-[600px] lg:flex-1"
          />
          <div className={cn("grid gap-4", stageNow ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3")}>
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
            {stageNow && (
              <BentoTile label="Etapa">
                <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                  <Route aria-hidden className="size-4 shrink-0 text-accent-violet" />
                  <span className="truncate">{stageNow.label}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {pending.length === 0
                    ? `${callTypeLabel(call.call_type)} · última etapa`
                    : `faltan ${pending.slice(0, 2).join(" y ")}${pending.length > 2 ? "…" : ""}`}
                </p>
              </BentoTile>
            )}
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
          stageMarks={stages.length === 0 ? null : stageMarks(call.segments, call.events, stages)}
          className="max-h-[520px] lg:max-h-none lg:[contain:size]"
        />
      </div>
    </div>
  );
}
