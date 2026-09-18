"use client";

import type { ReactNode } from "react";

import { cn } from "@/core/lib/utils";

interface AssistantStageProps {
  /** true mientras Axel trabaja: el personaje respira y su sombra se encoge en contrafase. */
  busy?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * El suelo de Axel: el personaje de pie sobre una sombra de contacto.
 *
 * Sustituye al orbe (disco, borde, halo y anillo cometa), que el dueño quitó
 * para dejar solo al personaje. La sombra es un `radial-gradient` sin `filter`,
 * y la respiración —solo con `busy`, es decir, con un trabajo del servidor en
 * curso— es un `transform` del raíz HTML: compositor, sin repintar el SVG.
 * Decorativo: quien lo envuelve decide si es un botón o una imagen.
 */
export function AssistantStage({ busy = false, className, children }: AssistantStageProps) {
  return (
    <span className={cn("assistant-stage", busy && "assistant-stage--busy", className)} aria-hidden="true">
      <span className="assistant-ground" />
      <span className="assistant-stage-figure">{children}</span>
    </span>
  );
}
