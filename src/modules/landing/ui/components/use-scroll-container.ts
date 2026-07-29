"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * El scroll de la landing NO ocurre en `window`: el layout público delega el
 * scroll a un `<div data-app-scroll>` (de él depende el glass del SiteHeader).
 * Todo efecto de scroll de framer-motion (`useScroll`, `useInView` con root)
 * debe apuntar a ese contenedor.
 *
 * Devuelve la ref del contenedor y un flag `ready` para montar los efectos
 * solo cuando el elemento existe (SSR-safe).
 */
export function useScrollContainer(): {
  containerRef: RefObject<HTMLElement | null>;
  ready: boolean;
} {
  const containerRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-app-scroll]");
    if (el) {
      containerRef.current = el;
      setReady(true);
    }
  }, []);

  return { containerRef, ready };
}
