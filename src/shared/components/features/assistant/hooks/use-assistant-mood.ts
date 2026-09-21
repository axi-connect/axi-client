"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import {
  canGreet,
  GESTURE_MS,
  gestureForTap,
  resolveAssistantMood,
  TAP_COOLDOWN_MS,
  TAP_WINDOW_MS,
  type AssistantGesture,
  type AssistantMood,
  type AssistantMoodInput,
} from "../avatar/avatar-mood";

export interface AssistantMoodState {
  mood: AssistantMood;
  gesture: AssistantGesture | null;
  /** false = sin gestos, sin mirada, sin transiciones (`prefers-reduced-motion`). */
  motion: boolean;
  /** Toque/click/Enter sobre el personaje. Inerte bajo reduced-motion, en cooldown o con el asistente ocupado. */
  greet: () => void;
  /** Un gesto disparado por el slice (el asentimiento al celebrar una propuesta). */
  playGesture: (kind: AssistantGesture) => void;
}

/**
 * El humor del personaje derivado de una instantánea de primitivos, más el
 * único estado con reloj que es del kit: el gesto en curso.
 *
 * Los temporizadores viven aquí y no en el dominio (que es puro) ni en el
 * renderer (que solo pinta). Un gesto termina por `setTimeout`, no por
 * `animationend`: bajo reduced-motion la animación es `none` y ese evento no
 * llegaría nunca. Todo se limpia al desmontar y al ocultarse la pestaña.
 *
 * La celebración (`celebrating`) la decide el slice, porque solo él sabe qué
 * es una buena noticia (una propuesta nueva en Axel); llega ya resuelta en la
 * instantánea.
 */
export function useAssistantMood(input: AssistantMoodInput): AssistantMoodState {
  const reduced: boolean | null = useReducedMotion();
  const motion = reduced !== true;

  const [gesture, setGesture] = useState<AssistantGesture | null>(null);
  const gestureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownUntil = useRef(0);
  const taps = useRef({ count: 0, firstAt: 0 });

  const endGesture = useCallback(() => {
    if (gestureTimer.current !== null) clearTimeout(gestureTimer.current);
    gestureTimer.current = null;
    setGesture(null);
    cooldownUntil.current = Date.now() + TAP_COOLDOWN_MS;
  }, []);

  const playGesture = useCallback(
    (kind: AssistantGesture) => {
      if (!motion) return;
      if (gestureTimer.current !== null) clearTimeout(gestureTimer.current);
      setGesture(kind);
      gestureTimer.current = setTimeout(endGesture, GESTURE_MS[kind]);
    },
    [endGesture, motion],
  );

  // La pestaña se oculta: el gesto no debe reaparecer a medias al volver.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") endGesture();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [endGesture]);

  useEffect(
    () => () => {
      if (gestureTimer.current !== null) clearTimeout(gestureTimer.current);
    },
    [],
  );

  const mood = resolveAssistantMood(input);

  const greet = useCallback(() => {
    if (!motion || gestureTimer.current !== null || Date.now() < cooldownUntil.current) return;
    if (!canGreet(mood)) return;
    const now = Date.now();
    if (now - taps.current.firstAt > TAP_WINDOW_MS) taps.current = { count: 0, firstAt: now };
    taps.current.count += 1;
    const kind = gestureForTap(taps.current.count);
    if (kind === "wave") taps.current = { count: 0, firstAt: 0 };
    playGesture(kind);
  }, [motion, mood, playGesture]);

  return { mood, gesture, motion, greet, playGesture };
}
