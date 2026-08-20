"use client";

import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";

/**
 * Lo que se ve mientras Axel piensa.
 *
 * El cliente **no tiene streaming** (cero `EventSource`, cero `ReadableStream`)
 * y no vale abrir ese transporte solo para esto. Pero un turno de Axel encadena
 * varias lecturas y puede tardar cuarenta segundos, así que un skeleton mudo
 * durante ese rato se lee como "se colgó" y el usuario recarga — perdiendo el
 * análisis que ya se pagó.
 *
 * La solución es honesta y barata: **decir en qué fase va**, rotando frases
 * cada pocos segundos. No son datos reales del servidor y por eso ninguna
 * afirma un resultado; describen lo que el runtime hace de verdad (leer el
 * embudo, mirar el CRM, cruzar el calendario), así que el usuario aprende qué
 * está pasando en vez de esperar a ciegas.
 */

/** Fases reales del turno, en el orden en que el runtime las suele recorrer. */
const PHASES = [
  "Revisando tus números…",
  "Mirando dónde se está yendo la plata…",
  "Cruzando el calendario comercial…",
  "Armando la recomendación…",
  "Ya casi: puliendo las cifras…",
] as const;

/** Cada frase dura lo suficiente para leerse sin parecer un carrusel. */
const PHASE_MS = 6000;

export function AxelThinking() {
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
    <div
      className="self-stretch rounded-lg border border-border bg-background p-4 shadow-float"
      // `polite` y no `assertive`: es progreso, no una alerta que deba
      // interrumpir lo que el lector de pantalla esté diciendo.
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col gap-2">
        <div className="h-2 animate-pulse rounded-full bg-accent-violet/15" />
        <div className="h-2 w-4/5 animate-pulse rounded-full bg-accent-violet/15 [animation-delay:140ms]" />
        <div className="h-2 w-3/5 animate-pulse rounded-full bg-accent-violet/15 [animation-delay:280ms]" />
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <ScanLine className="size-3.5 flex-none" aria-hidden="true" />
        {PHASES[phase]}
      </p>
    </div>
  );
}
