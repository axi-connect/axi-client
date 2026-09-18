"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { useReducedMotion } from "framer-motion";

import { cssEase } from "@/core/styles/motion";

/**
 * El viaje del compositor del centro al pie, UNA vez, al primer mensaje.
 *
 * Se mide su posición mientras la vista está vacía (una lectura de layout por
 * render, y solo en ese estado); en el render que deja de estarlo se mide de
 * nuevo y la diferencia se anima con `transform` vía WAAPI. No se anima el
 * layout: React ya lo cambió de golpe, y el navegador solo interpola un
 * `translateY`. Sin `animate` (jsdom) o con movimiento reducido, salto directo.
 */
export function useComposerFlip(ref: RefObject<HTMLDivElement | null>, isEmpty: boolean): void {
  const reduced: boolean | null = useReducedMotion();
  const lastTop = useRef<number | null>(null);
  const wasEmpty = useRef(isEmpty);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    if (isEmpty) {
      lastTop.current = el.getBoundingClientRect().top;
    } else if (wasEmpty.current && lastTop.current !== null) {
      const dy = lastTop.current - el.getBoundingClientRect().top;
      lastTop.current = null;
      if (reduced !== true && Math.abs(dy) > 1 && typeof el.animate === "function") {
        el.animate([{ transform: `translateY(${String(dy)}px)` }, { transform: "translateY(0)" }], {
          duration: 420,
          easing: cssEase.fallback,
        });
      }
    }
    wasEmpty.current = isEmpty;
  }, [ref, isEmpty, reduced]);
}
