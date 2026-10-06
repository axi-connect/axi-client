"use client";

import { useEffect, useState } from "react";

interface InViewOptions {
  /** El scroller del hilo. Sin él, la ventana. */
  root?: Element | null;
  /** Lo que tapa la isla arriba no cuenta como «a la vista». */
  rootMargin?: string;
  threshold?: number;
}

/**
 * Si un elemento está a la vista dentro de su scroller. Es lo que decide si la
 * pregunta viva sube a la isla (decisión D1 del dueño: una sola copia visible).
 *
 * `IntersectionObserver` avisa solo al CRUZAR el umbral, no en cada píxel de
 * scroll: el estado cambia dos veces por lectura del hilo como mucho, sin
 * escuchar `scroll`. Sin elemento, o sin la API (jsdom, navegadores viejos),
 * se considera a la vista: la isla no despliega nada que la persona ya ve.
 */
export function useInView(target: Element | null, { root = null, rootMargin = "0px", threshold = 0 }: InViewOptions = {}): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    if (target === null || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry !== undefined) setInView(entry.isIntersecting);
      },
      { root, rootMargin, threshold },
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [target, root, rootMargin, threshold]);
  return inView;
}
