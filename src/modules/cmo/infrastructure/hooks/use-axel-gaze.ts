"use client";

import { useEffect, type RefObject } from "react";

/** Distancia (px) a la que la mirada satura hacia el borde del ojo. */
const RADIUS = 280;
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

/**
 * Los ojos de Axel siguen al puntero.
 *
 * Escribe `--gaze-x` / `--gaze-y` en [−1, 1] directamente en el nodo por ref y
 * el CSS mueve pupilas (y un poco la cabeza) con `transform` + una transición
 * corta. **Cero estado de React**: un `useState` por `pointermove` serían 60
 * renders por segundo del hero. Y **cero bucle**: un solo `requestAnimationFrame`
 * por movimiento, coalescido; cuando el puntero se para no queda nada vivo.
 *
 * Solo con puntero fino: en táctil no hay «dedo flotando» y el toque ya es el
 * gesto. Solo mientras el avatar está en pantalla (IntersectionObserver): no se
 * escribe a un nodo que el scroll dejó arriba. Al salir el ratón de la página,
 * vuelve al centro con una transición más larga (`data-gaze="settle"`).
 */
export function useAxelGaze(ref: RefObject<SVGSVGElement | null>, { enabled }: { enabled: boolean }): void {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || el === null) return;
    if (!window.matchMedia(FINE_POINTER).matches) return;

    let raf = 0;
    let px = 0;
    let py = 0;
    let listening = false;

    const frame = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const gx = Math.max(-1, Math.min(1, (px - cx) / RADIUS));
      const gy = Math.max(-1, Math.min(1, (py - cy) / RADIUS));
      el.style.setProperty("--gaze-x", gx.toFixed(3));
      el.style.setProperty("--gaze-y", gy.toFixed(3));
      el.dataset.tracking = "1";
      delete el.dataset.gaze;
    };
    const onMove = (event: PointerEvent) => {
      px = event.clientX;
      py = event.clientY;
      if (raf === 0) raf = requestAnimationFrame(frame);
    };
    const settle = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      el.style.setProperty("--gaze-x", "0");
      el.style.setProperty("--gaze-y", "0");
      delete el.dataset.tracking;
      el.dataset.gaze = "settle";
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible") settle();
    };
    const listen = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      if (on) {
        window.addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("mouseleave", settle);
      } else {
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("mouseleave", settle);
        settle();
      }
    };

    // Arranca escuchando y deja que el observer lo apague: en jsdom el observer
    // es un no-op que nunca dispara, y al revés la mirada no se activaría nunca.
    listen(true);
    document.addEventListener("visibilitychange", onVisibility);
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => {
            for (const entry of entries) listen(entry.isIntersecting);
          });
    observer?.observe(el);

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      listen(false);
      delete el.dataset.gaze;
      el.style.removeProperty("--gaze-x");
      el.style.removeProperty("--gaze-y");
    };
  }, [ref, enabled]);
}
