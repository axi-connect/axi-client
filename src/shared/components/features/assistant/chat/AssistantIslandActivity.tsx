"use client";

import { useEffect, useState } from "react";
import { Check, Search } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { AssistantLiveStep } from "../types";

/** Cada frase del respaldo dura lo suficiente para leerse sin parecer un carrusel. */
const PHASE_MS = 6000;

interface AssistantIslandActivityProps {
  /** Pasos REALES del turno, si el canal en vivo los trae. */
  steps?: readonly AssistantLiveStep[];
  /** Frases de respaldo cuando no hay pasos (sin socket, o un asistente sin pasos). */
  phrases?: readonly string[];
  className?: string;
}

interface Line {
  label: string;
  done: boolean;
  ms: number | null;
}

/**
 * Lo que la isla M enseña mientras el asistente trabaja: el paso anterior,
 * apagado, y el actual, grande. Como el «Prep workspace» de la referencia, pero
 * sin inventar el siguiente: el servidor no anuncia qué va a correr, solo lo
 * que está corriendo.
 *
 * Sin pasos, las frases de respaldo con la misma forma: la anterior arriba y la
 * de ahora debajo. Se detienen en la última; seguir rotando sería un bucle.
 */
export function AssistantIslandActivity({ steps = [], phrases = [], className }: AssistantIslandActivityProps) {
  const phase = usePhase(steps.length > 0 ? 0 : phrases.length);
  const lines = steps.length > 0 ? stepLines(steps) : phraseLines(phrases, phase);
  const done = steps.filter((step) => step.done).length;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)} aria-live="polite" aria-busy="true">
      <ol className="assistant-island__activity">
        {lines.map((line, index) => {
          const current = index === lines.length - 1;
          return (
            <li
              // Posición + texto: al llegar un paso, el actual sube a «anterior» y
              // se vuelve a montar con su nueva forma, sin arrastrar estilos.
              key={`${String(index)}-${line.label}`}
              className={cn("assistant-island__line", current ? "assistant-island__line--now" : "assistant-island__line--before")}
            >
              {current ? (
                <Search className="size-4 flex-none" aria-hidden="true" />
              ) : (
                <Check className="size-3.5 flex-none" aria-hidden="true" />
              )}
              {/* El actual puede partirse en dos líneas (isla estrecha en móvil); el anterior se trunca. */}
              <span className={cn("min-w-0", current ? "line-clamp-2" : "truncate")} title={current ? undefined : line.label}>
                {line.label}
              </span>
              {!current && line.ms !== null ? (
                <span className="flex-none text-[10.5px] tabular-nums opacity-70">{line.ms} ms</span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {/* Lo que se puede afirmar sin inventar: cuántas lecturas van hechas. El
          cliente no sabe cuántas faltan, así que no promete un total. */}
      {done > 0 ? (
        <p className="text-[11px] text-muted-foreground tabular-nums">
          Trabajando · {done} {done === 1 ? "lectura" : "lecturas"}
        </p>
      ) : null}
    </div>
  );
}

/** El anterior y el actual. Un paso que ya terminó sigue siendo el actual hasta que llegue otro. */
function stepLines(steps: readonly AssistantLiveStep[]): Line[] {
  return steps.slice(-2).map((step) => ({ label: step.label, done: step.done, ms: step.ms }));
}

function phraseLines(phrases: readonly string[], phase: number): Line[] {
  if (phrases.length === 0) return [{ label: "Pensando…", done: false, ms: null }];
  const current = { label: phrases[phase] ?? "", done: false, ms: null };
  const before = phase > 0 ? phrases[phase - 1] : undefined;
  return before === undefined ? [current] : [{ label: before, done: true, ms: null }, current];
}

function usePhase(count: number): number {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (phase >= count - 1) return;
    const timer = setTimeout(() => {
      setPhase((current) => Math.min(current + 1, count - 1));
    }, PHASE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [phase, count]);
  return phase;
}
