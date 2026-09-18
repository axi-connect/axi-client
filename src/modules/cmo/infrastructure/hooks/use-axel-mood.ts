"use client";

import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { useCmoStore, type CmoBlocker, type UiMessage } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { PROUD_MS } from "@/shared/components/features/assistant/avatar/avatar-mood";
import {
  useAssistantMood,
  type AssistantMoodState,
} from "@/shared/components/features/assistant/hooks/use-assistant-mood";

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

export type AxelMoodState = Omit<AssistantMoodState, "playGesture">;

/**
 * El humor de Axel: la costura entre el store del CMO y el reloj de humor del
 * kit (`useAssistantMood`, que resuelve la cara y gobierna gestos y saludo).
 *
 * Lo único que queda aquí, porque solo el CMO lo sabe, es **qué es una buena
 * noticia**: una propuesta recién armada. Celebración solo con lo NUEVO. En el
 * primer efecto se anotan el último id y el contador y no se celebra nada —
 * un hilo recargado con una propuesta vieja como último mensaje no es una
 * noticia. Con la pestaña oculta tampoco: la insignia de `unseen` ya persiste,
 * y volver para encontrarse una celebración a medias es peor que ninguna.
 */
export function useAxelMood({ ownerTyping }: { ownerTyping: boolean }): AxelMoodState {
  const snap = useCmoStore(useShallow(selectMoodSnapshot));
  const [celebrating, setCelebrating] = useState(false);
  const proudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { mood, gesture, motion, greet, playGesture } = useAssistantMood({
    blocker: snap.blocker,
    thinking: snap.thinking,
    streaming: snap.streaming,
    lastMessage:
      snap.lastRole === null
        ? null
        : {
            // Los roles del CMO traducidos a los del kit.
            role: snap.lastRole === "owner" ? "user" : snap.lastRole === "axel" ? "assistant" : "system",
            failed: snap.lastFailed,
            hasProposal: snap.lastProposal,
            hasQuestion: snap.lastQuestion,
          },
    ownerTyping,
    celebrating,
  });

  const seen = useRef<{ lastId: string | null; unseen: number } | null>(null);
  useEffect(() => {
    const previous = seen.current;
    seen.current = { lastId: snap.lastId, unseen: snap.unseen };
    if (previous === null) return;
    const newProposalMessage = snap.lastId !== previous.lastId && snap.lastRole === "axel" && snap.lastProposal;
    const newUnseen = snap.unseen > previous.unseen;
    if (!newProposalMessage && !newUnseen) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    setCelebrating(true);
    playGesture("nod");
    if (proudTimer.current !== null) clearTimeout(proudTimer.current);
    proudTimer.current = setTimeout(() => {
      proudTimer.current = null;
      setCelebrating(false);
    }, PROUD_MS);
  }, [snap.lastId, snap.unseen, snap.lastRole, snap.lastProposal, playGesture]);

  useEffect(
    () => () => {
      if (proudTimer.current !== null) clearTimeout(proudTimer.current);
    },
    [],
  );

  return { mood, gesture, motion, greet };
}
