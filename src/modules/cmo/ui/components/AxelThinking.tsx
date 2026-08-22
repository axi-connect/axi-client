"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, ScanLine } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { LiveStep } from "@/modules/cmo/infrastructure/stores/cmo.store";

/**
 * Lo que se ve mientras Axel trabaja.
 *
 * Dos modos, y el segundo existe porque el primero era un placebo:
 *
 * · **Con socket** llegan los pasos REALES del turno (`cmo.turn_step`): qué
 *   fuente está leyendo, cuál terminó y cuánto tardó. La etiqueta la escribe el
 *   servidor, que es el único que sabe qué herramienta corrió.
 * · **Sin socket** se conservan las frases rotando. No son datos del servidor y
 *   ninguna afirma un resultado, pero un turno tarda decenas de segundos y un
 *   skeleton mudo se lee como «se colgó»: el usuario recarga y pierde el
 *   análisis que ya pagó. Es el respaldo honesto, no el modo normal.
 */

/** Fases del respaldo, en el orden en que el runtime las suele recorrer. */
const PHASES = [
  "Revisando tus números…",
  "Mirando dónde se está yendo la plata…",
  "Cruzando el calendario comercial…",
  "Armando la recomendación…",
  "Ya casi: puliendo las cifras…",
] as const;

/** Cada frase dura lo suficiente para leerse sin parecer un carrusel. */
const PHASE_MS = 6000;

export function AxelThinking({ steps = [] }: { steps?: LiveStep[] }) {
  const live = steps.length > 0;
  return (
    <div
      className="self-stretch rounded-lg border border-border bg-background p-4 shadow-float"
      // `polite` y no `assertive`: es progreso, no una alerta que deba
      // interrumpir lo que el lector de pantalla esté diciendo.
      aria-live="polite"
      aria-busy="true"
    >
      {live ? <Steps steps={steps} /> : <Phases />}
    </div>
  );
}

/** Los pasos de verdad: uno por herramienta, con su estado y su duración. */
function Steps({ steps }: { steps: LiveStep[] }) {
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
              "flex items-center gap-2.5 py-1.5 text-xs",
              step.done ? "text-muted-foreground" : "font-medium text-foreground",
            )}
          >
            {step.done ? (
              <Check className="size-3.5 flex-none text-success" aria-hidden="true" />
            ) : (
              <Loader2
                className="size-3.5 flex-none animate-spin text-accent-violet"
                aria-hidden="true"
              />
            )}
            <span className="min-w-0 flex-1">{step.label}</span>
            {step.ms !== null ? (
              <span className="flex-none text-[10.5px] text-muted-foreground/70 tabular-nums">
                {step.ms} ms
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground/70">
        <ScanLine className="size-3 flex-none" aria-hidden="true" />
        {/* Lo que se puede afirmar sin inventar: cuántas lecturas hay hechas. El
            cliente no sabe cuántas faltan, así que no promete un total. */}
        {done === 0
          ? "Axel está trabajando"
          : `Axel está trabajando · ${String(done)} ${done === 1 ? "lectura" : "lecturas"} hasta ahora`}
      </p>
    </>
  );
}

/** El respaldo: sin pasos que mostrar, se dice en qué fase suele ir. */
function Phases() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Se detiene en la última: seguir rotando indefinidamente parecería un bucle
    // y quitaría la sensación de progreso, que es justo lo que aporta.
    if (phase >= PHASES.length - 1) return;
    const timer = setTimeout(() => {
      setPhase((current) => Math.min(current + 1, PHASES.length - 1));
    }, PHASE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [phase]);

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="h-2 animate-pulse rounded-full bg-accent-violet/15" />
        <div className="h-2 w-4/5 animate-pulse rounded-full bg-accent-violet/15 [animation-delay:140ms]" />
        <div className="h-2 w-3/5 animate-pulse rounded-full bg-accent-violet/15 [animation-delay:280ms]" />
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <ScanLine className="size-3.5 flex-none" aria-hidden="true" />
        {PHASES[phase]}
      </p>
    </>
  );
}
