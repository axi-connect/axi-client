"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, ScanLine } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { AssistantLiveStep } from "../types";

/** Cada frase del respaldo dura lo suficiente para leerse sin parecer un carrusel. */
const PHASE_MS = 6000;

interface AssistantThinkingProps {
  /** Pasos REALES del turno, si el canal en vivo los trae. */
  steps?: readonly AssistantLiveStep[];
  /**
   * Frases de respaldo cuando no hay pasos (sin socket). Sin ellas se pintan
   * tres puntos: honesto para un asistente que no informa de sus pasos.
   */
  phrases?: readonly string[];
  className?: string;
}

/**
 * Lo que se ve mientras el asistente trabaja. Es un indicador ligado a un
 * trabajo del servidor (DESIGN-SYSTEM §6): existe mientras el turno dura.
 *
 * Tres modos, del más al menos informado:
 *
 * · **Pasos**: qué fuente está leyendo, cuál terminó y cuánto tardó. La
 *   etiqueta la escribe el servidor, que es el único que sabe qué corrió.
 * · **Frases**: no son datos del servidor y ninguna afirma un resultado, pero
 *   un turno tarda decenas de segundos y un skeleton mudo se lee como «se
 *   colgó»: la persona recarga y pierde el análisis que ya pagó.
 * · **Puntos**: tres puntos en una burbuja pequeña, el signo universal de
 *   «está escribiendo».
 */
export function AssistantThinking({ steps = [], phrases, className }: AssistantThinkingProps) {
  if (steps.length > 0) {
    return (
      <div className={cn(CARD, className)} aria-live="polite" aria-busy="true">
        <Steps steps={steps} />
      </div>
    );
  }
  if (phrases !== undefined && phrases.length > 0) {
    return (
      <div className={cn(CARD, className)} aria-live="polite" aria-busy="true">
        <Phases phrases={phrases} />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "assistant-dots self-start inline-flex gap-1.5 rounded-[20px] rounded-bl-[6px] bg-background px-[18px] py-[15px] shadow-float",
        className,
      )}
      role="status"
      aria-busy="true"
      aria-label="Está pensando"
    >
      <i />
      <i />
      <i />
    </div>
  );
}

const CARD = "self-stretch rounded-[20px] rounded-bl-[6px] bg-background p-4 shadow-float";

/** Los pasos de verdad: uno por herramienta, con su estado y su duración. */
function Steps({ steps }: { steps: readonly AssistantLiveStep[] }) {
  const done = steps.filter((step) => step.done).length;
  return (
    <>
      <ol className="flex flex-col">
        {steps.map((step, index) => (
          <li
            // El índice y no el nombre: la fila se REEMPLAZA en su sitio al
            // pasar de corriendo a terminada, y una misma herramienta puede
            // ejecutarse dos veces en un turno.
            key={index}
            className={cn(
              "flex items-center gap-2.5 py-1.5 text-[13px]",
              step.done ? "text-muted-foreground" : "font-medium text-foreground",
            )}
          >
            {step.done ? (
              <Check className="size-3.5 flex-none text-success" aria-hidden="true" />
            ) : (
              <Loader2 className="size-3.5 flex-none animate-spin text-accent-violet" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1">{step.label}</span>
            {step.ms !== null ? (
              <span className="flex-none text-[10.5px] text-muted-foreground/70 tabular-nums">{step.ms} ms</span>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground/70">
        <ScanLine className="size-3 flex-none" aria-hidden="true" />
        {/* Lo que se puede afirmar sin inventar: cuántas lecturas hay hechas. El
            cliente no sabe cuántas faltan, así que no promete un total. */}
        {done === 0 ? "Trabajando" : `Trabajando · ${String(done)} ${done === 1 ? "lectura" : "lecturas"}`}
      </p>
    </>
  );
}

/** El respaldo: sin pasos que mostrar, se dice en qué fase suele ir. */
function Phases({ phrases }: { phrases: readonly string[] }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Se detiene en la última: seguir rotando indefinidamente parecería un bucle
    // y quitaría la sensación de progreso, que es justo lo que aporta.
    if (phase >= phrases.length - 1) return;
    const timer = setTimeout(() => {
      setPhase((current) => Math.min(current + 1, phrases.length - 1));
    }, PHASE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [phase, phrases.length]);

  return (
    <>
      <div className="flex flex-col gap-2" aria-hidden="true">
        <div className="h-2 animate-pulse rounded-full bg-accent-violet/15" />
        <div className="h-2 w-4/5 animate-pulse rounded-full bg-accent-violet/15 [animation-delay:140ms]" />
        <div className="h-2 w-3/5 animate-pulse rounded-full bg-accent-violet/15 [animation-delay:280ms]" />
      </div>
      <p className="mt-3 flex items-center gap-2 text-[13px] text-muted-foreground">
        <ScanLine className="size-3.5 flex-none" aria-hidden="true" />
        {phrases[Math.min(phase, phrases.length - 1)]}
      </p>
    </>
  );
}
