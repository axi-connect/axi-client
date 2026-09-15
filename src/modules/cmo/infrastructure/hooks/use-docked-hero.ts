"use client";

import { useEffect, type RefObject } from "react";

/** Altura de la barra acoplada. La misma que `--dock-h` en globals.css. */
export const DOCK_HEIGHT_PX = 56;

interface DockedHeroOptions {
  /** false = no se observa nada (estado vacío centrado o Axel bloqueado). */
  enabled: boolean;
}

/**
 * Axel no se pierde al bajar: cuando el centinela (justo bajo el hero) cruza el
 * borde superior del scroller, la raíz del chat recibe `data-docked` y el CSS
 * encoge la barra a 40 px y la vuelve cristal, solo con `transform`/`opacity`.
 *
 * Un `IntersectionObserver` y no un listener de `scroll`: un callback por
 * cruce, no por frame. Y se escribe `dataset` por ref, sin `useState`: acoplar
 * la barra no re-renderiza nada de React. Sin `IntersectionObserver` (jsdom) es
 * un no-op y la barra se queda en estado hero.
 */
export function useDockedHero(
  root: RefObject<HTMLElement | null>,
  scroller: RefObject<HTMLElement | null>,
  sentinel: RefObject<HTMLElement | null>,
  { enabled }: DockedHeroOptions,
): void {
  useEffect(() => {
    const rootEl = root.current;
    const scrollerEl = scroller.current;
    const sentinelEl = sentinel.current;
    if (!enabled || rootEl === null || scrollerEl === null || sentinelEl === null) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const rootTop = entry.rootBounds?.top ?? 0;
          // Acoplado = el centinela salió por ARRIBA. Por abajo no ocurre en la
          // práctica, pero la guarda evita un falso acople en layouts cortos.
          const docked = !entry.isIntersecting && entry.boundingClientRect.top < rootTop;
          if (docked) rootEl.dataset.docked = "";
          else delete rootEl.dataset.docked;
        }
      },
      { root: scrollerEl, rootMargin: `-${String(DOCK_HEIGHT_PX)}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(sentinelEl);

    return () => {
      observer.disconnect();
      delete rootEl.dataset.docked;
    };
  }, [root, scroller, sentinel, enabled]);
}
