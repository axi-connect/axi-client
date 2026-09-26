"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/core/lib/utils";
import { StatePill } from "@/shared/components/features/bento";
import type { CallTranscriptSegment } from "@/modules/calls/domain/call";
import { formatCallClock } from "@/modules/calls/ui/lib/call-format";

const ROLE_DOT: Record<CallTranscriptSegment["role"], string> = {
  agent: "bg-accent-violet",
  caller: "bg-brand",
  system: "bg-muted-foreground",
};

type Row = {
  key: string;
  role: CallTranscriptSegment["role"];
  name: string;
  clock: string;
  text: string;
  live: boolean;
};

/**
 * La conversación entrando en vivo (canvas, tablero 3): una lista, no burbujas
 * (§9.5 «una ficha es una lista»). Sigue al último turno sin que el usuario
 * persiga el texto; el borrador del agente — lo que está diciendo AHORA — va
 * al final con su cursor y se reemplaza por su segmento al liquidar el turno.
 * Solo se anuncia lo definitivo (`aria-live` en la lista, el borrador fuera).
 */
export function LiveConversation({
  segments,
  draft,
  names,
  className,
}: {
  segments: readonly CallTranscriptSegment[];
  /** Texto del agente mientras suena, o null. */
  draft: string | null;
  names: { agent: string; caller: string };
  className?: string;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const rows: Row[] = segments.map((segment) => ({
    key: String(segment.seq),
    role: segment.role,
    name: segment.role === "agent" ? names.agent : segment.role === "caller" ? names.caller : "Axi",
    clock: formatCallClock(Math.round((segment.spoken_at_ms ?? segment.at_ms) / 1000)),
    text: segment.text,
    live: false,
  }));
  const lastClock = rows.at(-1)?.clock ?? formatCallClock(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [segments.length, draft]);

  return (
    <section
      aria-label="La conversación"
      className={cn("flex min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-card", className)}
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
        <h2 className="text-sm font-semibold">La conversación</h2>
        <StatePill tone="success">
          {segments.length === 1 ? "1 turno" : `${segments.length} turnos`}
        </StatePill>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2 [mask-image:linear-gradient(to_bottom,transparent,black_48px)]">
        {rows.length === 0 && draft === null ? (
          <p className="px-3 pt-10 text-center text-sm text-muted-foreground">
            Esperando la conversación…
          </p>
        ) : (
          <>
            <ol aria-live="polite" className="flex min-h-full flex-col justify-end gap-0.5 pt-12">
              {rows.map((row) => (
                <ConversationRow key={row.key} row={row} />
              ))}
            </ol>
            {draft !== null && (
              <div aria-hidden>
                <ConversationRow
                  row={{ key: "draft", role: "agent", name: names.agent, clock: lastClock, text: draft, live: true }}
                />
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} aria-hidden />
      </div>

      <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
        Entra turno a turno y queda guardada en el historial.
      </p>
    </section>
  );
}

function ConversationRow({ row }: { row: Row }) {
  const Element = row.live ? "div" : "li";
  return (
    <Element className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-2xl px-3 py-2.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
      <span className="pt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">{row.clock}</span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-semibold">
          <span aria-hidden className={cn("size-1.5 rounded-full", ROLE_DOT[row.role])} />
          {row.name}
          {row.live && <span className="font-normal text-muted-foreground">· ahora</span>}
        </p>
        <p
          className={cn(
            "mt-0.5 text-sm leading-relaxed text-pretty",
            row.role === "system" ? "text-muted-foreground" : "text-foreground/85",
          )}
        >
          {row.text}
          {row.live && (
            <span className="ml-0.5 inline-block h-[1em] w-0.5 animate-pulse bg-accent-violet align-[-0.15em] motion-reduce:animate-none" />
          )}
        </p>
      </div>
    </Element>
  );
}
