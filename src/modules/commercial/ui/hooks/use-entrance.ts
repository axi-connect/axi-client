"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

import { spring } from "@/core/styles/motion";

/**
 * Progreso 0→1 de entrada, UNA vez, con el resorte de marca (`spring.soft`).
 * Es el ÚNICO motor del hero: la cifra grande (`CountUpValue progress`) y la
 * línea de la ruta (`RouteLine progress`) leen el mismo valor, así llegan a la
 * vez y hay un solo re-render por frame en vez de dos animaciones sueltas.
 * Con `prefers-reduced-motion` empieza en 1.
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
