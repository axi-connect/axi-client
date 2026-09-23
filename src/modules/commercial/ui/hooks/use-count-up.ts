"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

import { spring } from "@/core/styles/motion";

/**
 * Progreso 0→1 de entrada, UNA vez, con el resorte de marca (`spring.soft`).
 * Lo comparten la cifra grande del hero y la línea de la ruta para que las
 * dos lleguen al mismo tiempo. Con `prefers-reduced-motion` empieza en 1.
 */
export function useEntrance(): number {
  const reduced = useReducedMotion();
  const [t, setT] = useState(() => (reduced ? 1 : 0));
  const played = useRef(false);

  useEffect(() => {
    if (played.current || reduced) {
      setT(1);
      return;
    }
    played.current = true;
    const controls = animate(0, 1, {
      ...spring.soft,
      onUpdate: (latest: number) => setT(Math.min(1, Math.max(0, latest))),
    });
    return () => controls.stop();
  }, [reduced]);

  return t;
}
