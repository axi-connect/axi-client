"use client";

import Link from "next/link";
import { cn } from "@/core/lib/utils";
import { CALL_PURPOSE_LABELS, CALL_STATUS_MAP, type CallSessionRowDTO } from "@/modules/calls/domain/call";
import { useLiveCallPreview } from "@/modules/calls/infrastructure/realtime/use-live-call-preview";
import { CallAura } from "@/modules/calls/ui/components/aura/CallAura";
import { formatCallClock } from "@/modules/calls/ui/lib/call-format";
import { speakerFirstName, whoLabel } from "@/modules/calls/ui/live/live-phrase";

const MODE_DOT = {
  agent: "bg-accent-violet",
  thinking: "bg-accent-violet",
  caller: "bg-brand",
  listening: "bg-muted-foreground",
  idle: "bg-muted-foreground",
} as const;

/**
 * Una llamada en curso en el Monitoreo (canvas, tablero 1): su aura en
 * pequeño, quién habla y lo último que se dijo. Toda la tarjeta abre la
 * llamada en vivo. `now` viene del padre: UN intervalo para toda la parrilla.
 */
export function LiveCallCard({ call, now }: { call: CallSessionRowDTO; now: number }) {
  const { mode, line } = useLiveCallPreview(call);
  const phone = call.direction === "outbound" ? call.to_number : call.from_number;
  const ringing = call.status !== "in_progress";
  const elapsed =
    call.started_at === null || ringing
      ? null
      : Math.max(0, Math.floor((now - new Date(call.started_at).getTime()) / 1000));
  const names = {
    agent: speakerFirstName(call.ai_agent_name, "el agente"),
    caller: speakerFirstName(call.contact?.name, "el cliente"),
  };

  return (
    <Link
      href={`/calls/${call.id}`}
      className="flex min-w-0 gap-4 rounded-2xl bg-muted/50 p-4 ring-1 ring-border transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span aria-hidden className="surface-dark relative size-[72px] shrink-0 overflow-hidden rounded-[20px] bg-background">
        <CallAura mode={mode} size="mini" seed={call.id.charCodeAt(0)} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[15px] font-semibold">{call.contact?.name ?? phone}</span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {elapsed === null ? (CALL_STATUS_MAP[call.status]?.label ?? "") : formatCallClock(elapsed)}
          </span>
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {CALL_PURPOSE_LABELS[call.purpose]}
          {call.ai_agent_name !== null ? ` · ${call.ai_agent_name}` : ""}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className={cn("size-1.5 rounded-full", MODE_DOT[mode])} />
          {whoLabel(mode, names, ringing)}
        </span>
        {line !== null && (
          <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-foreground/80">«{line.text}»</span>
        )}
      </span>
    </Link>
  );
}
