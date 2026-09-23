"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

/**
 * Valor numérico con count-up de entrada (0.6s easeOut) SOLO en la primera
 * carga; los cambios posteriores (período) actualizan directo — el crossfade
 * lo aporta la card contenedora. Con reduced-motion muestra el valor final.
 *
 * Con `progress` (0–1) NO anima por su cuenta: pinta `value × progress` y deja
 * el motor al padre. Así el hero de la ruta comercial mueve la cifra y la
 * línea con un solo resorte en vez de dos animaciones que se re-renderizan
 * cada frame por separado.
 *
 * Lo que se mueve va `aria-hidden`; el lector de pantalla lee solo el valor
 * final (`sr-only`). Un `aria-label` sobre un `<span>` no interactivo no se
 * anuncia de forma fiable.
 *
 * Vivía en `analytics/ui/components/conversion/`; lo consumen `analytics` y
 * `commercial`, así que su sitio es `shared`.
 */
export function CountUpValue({
  value,
  format,
  progress,
  className,
}: {
  value: number;
  format: (n: number) => string;
  /** Progreso externo 0–1. Con él, el componente no anima solo. */
  progress?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const driven = progress !== undefined;
  const [display, setDisplay] = useState(() => (reduced || driven ? value : 0));
  const animated = useRef(false);

  useEffect(() => {
    if (driven) return;
    if (animated.current || reduced) {
      setDisplay(value);
      return;
    }
    animated.current = true;
    const controls = animate(0, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (latest: number) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [value, reduced, driven]);

  const shown = driven ? value * Math.min(1, Math.max(0, progress)) : display;

  return (
    <span className={className}>
      <span aria-hidden>{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
