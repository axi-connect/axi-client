"use client";

import { cn } from "@/core/lib/utils";

/**
 * La marca del asistente de puesta en marcha: un orbe.
 *
 * **No es Axel y no debe parecerse.** Axel es el director de mercadeo del
 * tenant, con cara y personaje; confundir los dos ensucia los dos. Esto es
 * otra cosa: alguien del equipo de axi que te ayuda a arrancar. Y el signo de
 * IA que la gente ya reconoce no es una cara ni un icono: es un orbe con
 * gradiente. Coral y violeta —la acción y la IA— en un gradiente cónico con un
 * brillo especular arriba a la izquierda, como una esfera de verdad.
 *
 * El pulso y el halo solo aparecen con `busy` (hay un turno en curso). Un
 * latido permanente en una pantalla donde se está leyendo es ruido. Respeta
 * `prefers-reduced-motion` desde la hoja de estilos, no desde JS.
 */
export function AlbaMark({
  busy = false,
  size = 28,
  className,
}: {
  busy?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("intake-orb", className)}
      data-busy={busy ? "true" : "false"}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <i />
    </span>
  );
}
