"use client";

import { Play } from "lucide-react";
import type { MouseEvent } from "react";

import { PRODUCTOS_ANCHORS, PRODUCTOS_HERO } from "@/modules/landing/ui/content/productos.content";

/** Lo que tarda el viaje del hero al juego: lo bastante lento para ver bajar el teléfono. */
const DURATION_MS = 1600;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * «Jugar ahora»: en vez del salto del ancla, recorre el scroll hasta el juego
 * con una curva suave, así el visitante ve el vuelo del teléfono (usePhoneFlight
 * reacciona al scroll). Si toca la rueda o la pantalla, se detiene y manda él.
 * Sin JS o con movimiento reducido, es el enlace normal a #agente.
 */
export function ProductosPlayLink() {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const scroller = document.querySelector<HTMLElement>("[data-app-scroll]");
    const game = document.getElementById(PRODUCTOS_ANCHORS.game);
    if (!scroller || !game || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();
    const from = scroller.scrollTop;
    const to = from + game.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    const start = performance.now();
    let frame = 0;
    const stop = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
    };
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      scroller.scrollTop = from + (to - from) * ease(t);
      if (t < 1) frame = requestAnimationFrame(step);
      else {
        stop();
        window.history.replaceState(window.history.state, "", `#${PRODUCTOS_ANCHORS.game}`);
      }
    };
    window.addEventListener("wheel", stop, { passive: true, once: true });
    window.addEventListener("touchstart", stop, { passive: true, once: true });
    frame = requestAnimationFrame(step);
  };

  return (
    <a href={PRODUCTOS_HERO.play.href} className="pj-cta" onClick={onClick}>
      <Play className="size-3.5" fill="currentColor" aria-hidden="true" />
      {PRODUCTOS_HERO.play.label}
    </a>
  );
}
