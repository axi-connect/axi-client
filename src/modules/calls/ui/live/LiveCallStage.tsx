"use client";

import { Bot } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Island } from "@/shared/components/features/island";
import type { AuraMode } from "@/modules/calls/domain/live-call";
import { CallAura } from "@/modules/calls/ui/components/aura/CallAura";
import { useWordReveal } from "@/modules/calls/ui/hooks/use-word-reveal";
import type { StagePhrase } from "./live-phrase";

/** Color de quien habla: el punto, la palabra que suena y el cursor. */
const SPEAKER_DOT: Record<AuraMode, string> = {
  agent: "bg-accent-violet",
  thinking: "bg-accent-violet",
  caller: "bg-brand",
  listening: "bg-muted-foreground",
  idle: "bg-muted-foreground",
};
const ROLE_TEXT: Record<StagePhrase["role"], string> = {
  agent: "text-accent-violet",
  caller: "text-brand",
  system: "text-muted-foreground",
};
const ROLE_CARET: Record<StagePhrase["role"], string> = {
  agent: "bg-accent-violet",
  caller: "bg-brand",
  system: "bg-muted-foreground",
};

/**
 * El escenario de la llamada en vivo (canvas, tablero 3): una isla de TINTA en
 * los dos temas — es un panel de marca (§9.5.1) — con el aura detrás y la
 * frase que se está diciendo al frente, palabra a palabra. La frase es
 * `aria-hidden`: la conversación de al lado ya la anuncia entera.
 */
export function LiveCallStage({
  mode,
  who,
  phrase,
  clock,
  ticking,
  agentName,
  names,
  className,
}: {
  mode: AuraMode;
  /** Quién tiene la palabra, en texto («Habla Laura»). */
  who: string;
  phrase: StagePhrase | null;
  /** Tiempo de la llamada ya formateado, o el estado mientras no contesta. */
  clock: string;
  /** El reloj corre (ya contestó): punto verde. */
  ticking: boolean;
  agentName: string;
  names: { agent: string; caller: string };
  className?: string;
}) {
  return (
    <Island
      as="section"
      material="ink"
      glow="none"
      aria-label="La llamada en vivo"
      className={cn("flex min-h-[440px] flex-col p-5 sm:p-6", className)}
    >
      <div aria-hidden className="absolute inset-0 -z-10">
        <CallAura mode={mode} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-8 items-center gap-2 rounded-full bg-foreground/[0.07] px-3 text-xs font-medium ring-1 ring-foreground/10 backdrop-blur-md">
          <span aria-hidden className={cn("size-1.5 rounded-full", ticking ? "bg-success" : "bg-muted-foreground")} />
          <span className={cn(ticking && "font-mono tabular-nums")}>{clock}</span>
        </span>
        <span className="inline-flex h-8 min-w-0 items-center gap-2 rounded-full bg-foreground/[0.07] px-3 text-xs font-medium ring-1 ring-foreground/10 backdrop-blur-md">
          <Bot aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">{agentName} · agente IA</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2 py-8 text-center sm:px-10">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span aria-hidden className={cn("size-2 rounded-full", SPEAKER_DOT[mode])} />
          {who}
        </p>
        {phrase !== null && <Phrase phrase={phrase} />}
        {mode === "thinking" && (
          <span aria-hidden className="inline-flex items-center gap-1.5">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="size-2 animate-bounce rounded-full bg-accent-violet motion-reduce:animate-none"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
        )}
      </div>

      <ul aria-hidden className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <li className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-accent-violet" />
          habla {names.agent}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-brand" />
          habla {names.caller}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-muted-foreground" />
          en silencio
        </li>
      </ul>
    </Island>
  );
}

function Phrase({ phrase }: { phrase: StagePhrase }) {
  const { words, shown, done } = useWordReveal(phrase.text, { msPerWord: phrase.msPerWord });
  const said = words.slice(0, Math.max(0, shown - 1)).join(" ");
  const current = shown > 0 ? words[shown - 1] : "";
  return (
    <p
      aria-hidden
      className={cn(
        "max-w-xl font-heading text-2xl leading-[1.15] font-bold tracking-tight text-balance text-foreground transition-opacity duration-300 sm:text-3xl lg:text-4xl",
        phrase.role === "system" && "text-muted-foreground",
        phrase.dim && "opacity-40",
      )}
    >
      {said}
      {said !== "" && " "}
      <span className={cn(!done && ROLE_TEXT[phrase.role])}>{current}</span>
      {!done && (
        <span
          className={cn(
            "ml-1 inline-block h-[0.86em] w-[3px] animate-pulse rounded-sm align-[-0.08em] motion-reduce:animate-none",
            ROLE_CARET[phrase.role],
          )}
        />
      )}
    </p>
  );
}
