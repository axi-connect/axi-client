"use client";

import { cn } from "@/core/lib/utils";

/**
 * La marca del asistente de puesta en marcha.
 *
 * **No es Axel y no debe parecerse.** Axel es el director de mercadeo del
 * tenant, con cara y personaje; confundir los dos personajes ensucia los dos.
 * Esto es otra cosa: alguien del equipo de axi que te ayuda a arrancar, y su
 * representación es un signo, no un rostro — un anillo con un punto dentro, que
 * es lo más cerca de «alguien escuchando» que se puede dibujar sin fingir una
 * persona.
 *
 * El pulso solo aparece con `busy` (hay un turno en curso) y respeta
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
      className={cn("intake-mark", busy && "intake-mark--busy", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" width={size} height={size} fill="none">
        <defs>
          <linearGradient id="intake-mark-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--axi-brand)" />
            <stop offset="100%" stopColor="var(--axi-violet)" />
          </linearGradient>
        </defs>
        <circle
          cx="16"
          cy="16"
          r="13"
          stroke="url(#intake-mark-ring)"
          strokeWidth="2"
          // El arco abierto por abajo: un círculo cerrado se lee como un botón
          // de carga, y esto no está cargando nada.
          strokeLinecap="round"
          strokeDasharray="68 14"
          transform="rotate(115 16 16)"
        />
        <circle cx="16" cy="16" r="4.5" fill="url(#intake-mark-ring)" />
      </svg>
    </span>
  );
}
