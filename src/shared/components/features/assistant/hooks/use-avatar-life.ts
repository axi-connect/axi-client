"use client";

import { useEffect, useRef, type RefObject } from "react";

import { AVATAR_BLINK, nextBlinkDelayMs, nextSaccade } from "../avatar/avatar-rig";

interface AvatarLifeOptions {
  /** true mientras hay un trabajo del servidor en curso (pensando o hablando). */
  live: boolean;
  /** true = además de parpadear, mira alrededor (pensando). */
  saccades: boolean;
  /** false bajo `prefers-reduced-motion`: no se programa nada. */
  motion: boolean;
  /** Cualquier valor cuyo cambio merezca un parpadeo (el humor). */
  cue: string;
}

/**
 * La vida del personaje: parpadeo y sacadas de la mirada.
 *
 * **Solo con actividad.** DESIGN-SYSTEM §6 prohíbe loops autónomos en el
 * workspace, y el dueño lo ratificó: en reposo puro no hay un solo temporizador
 * vivo. Lo que sí se mueve, y por qué no cuenta como loop:
 *
 * - Mientras piensa o habla (`live`), parpadea a intervalos irregulares y,
 *   pensando (`saccades`), mira alrededor. Es un indicador ligado a un trabajo
 *   del servidor: existe mientras el turno dura y muere con él.
 * - Al cambiar `cue` (el humor), un parpadeo. Finito, disparado por un evento.
 * - Al montar la vista, un doble parpadeo de «despertar». Una vez por pantalla.
 *
 * Escribe al DOM por ref (`data-blink`, `--av-sac-x/y`) y no toca el estado de
 * React: el avatar no se re-renderiza por parpadear. Con la pestaña oculta todo
 * se pausa; al volver, si el turno sigue vivo, se retoma.
 */
export function useAvatarLife(
  ref: RefObject<SVGSVGElement | null>,
  { live, saccades, motion, cue }: AvatarLifeOptions,
): void {
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
    }, AVATAR_BLINK.durationMs);
  };

  // Despertar, una vez por montaje.
  const woke = useRef(false);
  useEffect(() => {
    if (woke.current || !motion) return;
    woke.current = true;
    later(() => {
      blinkOnce();
      later(blinkOnce, AVATAR_BLINK.doubleGapMs + 60);
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  // Un parpadeo al cambiar de humor (no en el primer render: ya hay despertar).
  const previousCue = useRef<string | null>(null);
  useEffect(() => {
    if (previousCue.current !== null && previousCue.current !== cue && motion) blinkOnce();
    previousCue.current = cue;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- blinkOnce es estable por ref
  }, [cue, motion]);

  // Vida con turno vivo: cadena de parpadeos y, pensando, sacadas.
  useEffect(() => {
    const el = ref.current;
    if (!live || !motion || el === null) return;
    let on = true;

    const blinkLoop = () => {
      later(() => {
        if (!on) return;
        blinkOnce();
        if (Math.random() < AVATAR_BLINK.doubleChance) later(() => on && blinkOnce(), AVATAR_BLINK.doubleGapMs);
        blinkLoop();
      }, nextBlinkDelayMs());
    };
    const saccadeLoop = () => {
      const next = nextSaccade();
      later(() => {
        if (!on) return;
        el.style.setProperty("--av-sac-x", String(next.x));
        el.style.setProperty("--av-sac-y", String(next.y));
        saccadeLoop();
      }, next.delayMs);
    };
    const start = () => {
      on = true;
      blinkLoop();
      if (saccades) saccadeLoop();
    };
    const stop = () => {
      on = false;
      cancelAll();
      el.style.setProperty("--av-sac-x", "0");
      el.style.setProperty("--av-sac-y", "0");
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
  }, [ref, live, saccades, motion]);

  // Al desmontar no queda ningún temporizador.
  useEffect(() => cancelAll, []);
}
