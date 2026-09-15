"use client";

import { useEffect, useRef, type RefObject } from "react";

import { AXEL_BLINK, nextBlinkDelayMs, nextSaccade } from "@/modules/cmo/domain/axel-avatar";
import type { AxelMood } from "@/modules/cmo/domain/axel-mood";

interface AxelLifeOptions {
  mood: AxelMood;
  /** true mientras hay un trabajo del servidor en curso (pensando o hablando). */
  live: boolean;
  /** false bajo `prefers-reduced-motion`: no se programa nada. */
  motion: boolean;
}

/**
 * La vida de Axel: parpadeo y sacadas de la mirada.
 *
 * **Solo con actividad.** DESIGN-SYSTEM §6 prohíbe loops autónomos en el
 * workspace, y el dueño lo ratificó: en reposo puro no hay un solo temporizador
 * vivo. Lo que sí se mueve, y por qué no cuenta como loop:
 *
 * - Mientras Axel piensa o habla (`live`), parpadea a intervalos irregulares y,
 *   pensando, mira alrededor. Es un indicador ligado a un trabajo del servidor:
 *   existe mientras el turno dura y muere con él.
 * - Al cambiar de humor, un parpadeo. Finito, disparado por un evento.
 * - Al montar la vista, un doble parpadeo de «despertar». Una vez por pantalla.
 *
 * Escribe al DOM por ref (`data-blink`, `--axel-sac-x/y`) y no toca el estado de
 * React: el avatar no se re-renderiza por parpadear. Con la pestaña oculta todo
 * se pausa; al volver, si el turno sigue vivo, se retoma.
 */
export function useAxelLife(ref: RefObject<SVGSVGElement | null>, { mood, live, motion }: AxelLifeOptions): void {
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
    return id;
  };
  const cancelAll = () => {
    for (const id of timers.current) clearTimeout(id);
    timers.current.clear();
  };
  const blinkOnce = () => {
    const el = ref.current;
    if (el === null) return;
    el.dataset.blink = "1";
    later(() => {
      delete el.dataset.blink;
    }, AXEL_BLINK.durationMs);
  };

  // Despertar, una vez por montaje.
  const woke = useRef(false);
  useEffect(() => {
    if (woke.current || !motion) return;
    woke.current = true;
    later(() => {
      blinkOnce();
      later(blinkOnce, AXEL_BLINK.doubleGapMs + 60);
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  // Un parpadeo al cambiar de humor (no en el primer render: ya hay despertar).
  const previousMood = useRef<AxelMood | null>(null);
  useEffect(() => {
    if (previousMood.current !== null && previousMood.current !== mood && motion) blinkOnce();
    previousMood.current = mood;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- blinkOnce es estable por ref
  }, [mood, motion]);

  // Vida con turno vivo: cadena de parpadeos y, pensando, sacadas.
  useEffect(() => {
    const el = ref.current;
    if (!live || !motion || el === null) return;
    let on = true;

    const blinkLoop = () => {
      later(() => {
        if (!on) return;
        blinkOnce();
        if (Math.random() < AXEL_BLINK.doubleChance) later(() => on && blinkOnce(), AXEL_BLINK.doubleGapMs);
        blinkLoop();
      }, nextBlinkDelayMs());
    };
    const saccadeLoop = () => {
      const next = nextSaccade();
      later(() => {
        if (!on) return;
        el.style.setProperty("--axel-sac-x", String(next.x));
        el.style.setProperty("--axel-sac-y", String(next.y));
        saccadeLoop();
      }, next.delayMs);
    };
    const start = () => {
      on = true;
      blinkLoop();
      if (mood === "thinking") saccadeLoop();
    };
    const stop = () => {
      on = false;
      cancelAll();
      el.style.setProperty("--axel-sac-x", "0");
      el.style.setProperty("--axel-sac-y", "0");
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (!on) start();
      } else stop();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
      delete el.dataset.blink;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- later/cancelAll/blinkOnce son estables por ref
  }, [ref, live, mood, motion]);

  // Al desmontar no queda ningún temporizador.
  useEffect(() => cancelAll, []);
}
