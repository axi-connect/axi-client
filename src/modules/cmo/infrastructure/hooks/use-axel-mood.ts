"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useShallow } from "zustand/react/shallow";

import {
  canGreet,
  GESTURE_MS,
  gestureForTap,
  PROUD_MS,
  resolveAxelMood,
  TAP_COOLDOWN_MS,
  TAP_WINDOW_MS,
  type AxelGesture,
  type AxelMood,
} from "@/modules/cmo/domain/axel-mood";
import { useCmoStore, type CmoBlocker, type UiMessage } from "@/modules/cmo/infrastructure/stores/cmo.store";

type CmoStoreState = ReturnType<typeof useCmoStore.getState>;

/**
 * Lo ÚNICO que el avatar lee del store. Nueve primitivos: con `useShallow`,
 * mientras ninguno cambie el avatar no se re-renderiza — y durante un turno de
 * streaming cambian dos veces (al primer delta y al cerrar), no en cada delta.
 * Nunca `live`, `live.text` ni `live.steps`: referencias nuevas en cada evento.
 */
export interface MoodSnapshot {
  thinking: boolean;
  streaming: boolean;
  blocker: CmoBlocker;
  lastId: string | null;
  lastRole: UiMessage["role"] | null;
  lastFailed: boolean;
  lastProposal: boolean;
  lastQuestion: boolean;
  unseen: number;
}

export const selectMoodSnapshot = (state: CmoStoreState): MoodSnapshot => {
  const last = state.thread.messages.at(-1);
  return {
    thinking: state.thread.thinking,
    streaming: state.live !== null && state.live.text.length > 0,
    blocker: state.blocker,
    lastId: last?.id ?? null,
    lastRole: last?.role ?? null,
    lastFailed: last?.failed !== undefined,
    lastProposal: (last?.proposal_id ?? null) !== null,
    lastQuestion: (last?.question ?? null) !== null,
    unseen: state.unseen,
  };
};

export interface AxelMoodState {
  mood: AxelMood;
  gesture: AxelGesture | null;
  /** false = sin gestos, sin mirada, sin transiciones (`prefers-reduced-motion`). */
  motion: boolean;
  /** Toque/click/Enter sobre Axel. Inerte bajo reduced-motion, en cooldown o con Axel ocupado. */
  greet: () => void;
}

/**
 * El humor de Axel, derivado del store, más los dos únicos estados con reloj:
 * la celebración de una propuesta nueva y el gesto en curso.
 *
 * Los temporizadores viven aquí y no en el dominio (que es puro) ni en el
 * renderer (que solo pinta). Un gesto termina por `setTimeout`, no por
 * `animationend`: bajo reduced-motion la animación es `none` y ese evento no
 * llegaría nunca. Todo se limpia al desmontar y al ocultarse la pestaña.
 */
export function useAxelMood({ ownerTyping }: { ownerTyping: boolean }): AxelMoodState {
  const snap = useCmoStore(useShallow(selectMoodSnapshot));
  const reduced: boolean | null = useReducedMotion();
  const motion = reduced !== true;

  const [celebrating, setCelebrating] = useState(false);
  const [gesture, setGesture] = useState<AxelGesture | null>(null);
  const proudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    (kind: AxelGesture) => {
      if (gestureTimer.current !== null) clearTimeout(gestureTimer.current);
      setGesture(kind);
      gestureTimer.current = setTimeout(endGesture, GESTURE_MS[kind]);
    },
    [endGesture],
  );

  /**
   * Celebración: solo lo NUEVO. En el primer efecto se anotan el último id y
   * el contador y no se celebra nada — un hilo recargado con una propuesta
   * vieja como último mensaje no es una noticia. Con la pestaña oculta tampoco:
   * la insignia de `unseen` ya persiste, y volver a la pestaña para encontrarse
   * una celebración a medias es peor que ninguna.
   */
  const seen = useRef<{ lastId: string | null; unseen: number } | null>(null);
  useEffect(() => {
    const previous = seen.current;
    seen.current = { lastId: snap.lastId, unseen: snap.unseen };
    if (previous === null) return;
    const newProposalMessage =
      snap.lastId !== previous.lastId && snap.lastRole === "axel" && snap.lastProposal;
    const newUnseen = snap.unseen > previous.unseen;
    if (!newProposalMessage && !newUnseen) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    setCelebrating(true);
    if (motion) playGesture("nod");
    if (proudTimer.current !== null) clearTimeout(proudTimer.current);
    proudTimer.current = setTimeout(() => {
      proudTimer.current = null;
      setCelebrating(false);
    }, PROUD_MS);
  }, [snap.lastId, snap.unseen, snap.lastRole, snap.lastProposal, motion, playGesture]);

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
      if (proudTimer.current !== null) clearTimeout(proudTimer.current);
      if (gestureTimer.current !== null) clearTimeout(gestureTimer.current);
    },
    [],
  );

  const mood = resolveAxelMood({
    blocker: snap.blocker,
    thinking: snap.thinking,
    streaming: snap.streaming,
    lastMessage:
      snap.lastRole === null
        ? null
        : {
            role: snap.lastRole,
            failed: snap.lastFailed,
            hasProposal: snap.lastProposal,
            hasQuestion: snap.lastQuestion,
          },
    ownerTyping,
    celebrating,
  });

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

  return { mood, gesture, motion, greet };
}
