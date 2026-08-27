import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/core/lib/utils";

/**
 * Columna de marquee vertical en CSS puro (`.animate-marquee-vertical`,
 * globals.css): dos copias del contenido desplazándose una copia completa —
 * bucle sin costura, compositor, cero JS. RSC.
 *
 * El contenedor padre pausa todas las columnas con `group/wall` en hover y
 * `prefers-reduced-motion` las deja quietas (primera copia visible).
 */
export function MarqueeColumn({
  reverse = false,
  duration = "44s",
  className,
  children,
}: {
  reverse?: boolean;
  /** Segundos por vuelta (CSS time, p.ej. "48s") — velocidades distintas por columna dan profundidad. */
  duration?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("flex flex-col gap-4 overflow-hidden", className)}
      style={{ "--marquee-duration": duration, "--marquee-gap": "1rem" } as CSSProperties}
    >
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1}
          className={cn(
            "animate-marquee-vertical flex shrink-0 flex-col gap-4",
            reverse && "[animation-direction:reverse]",
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
