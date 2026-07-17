"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

/**
 * Valor numérico con count-up de entrada (0.6s easeOut) SOLO en la primera
 * carga; los cambios posteriores (período) actualizan directo — el crossfade
 * lo aporta la card contenedora. Con reduced-motion muestra el valor final.
 */
export function CountUpValue({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(() => (reduced ? value : 0));
  const animated = useRef(false);

  useEffect(() => {
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
  }, [value, reduced]);

  return (
    <span className={className} aria-label={format(value)}>
      {format(display)}
    </span>
  );
}
