"use client";

import { useShallow } from "zustand/react/shallow";

import { useIntakeStore } from "@/modules/intake/infrastructure/stores/intake.store";
import { useAssistantMood, type AssistantMoodState } from "@/shared/components/features/assistant";

type IntakeStoreState = ReturnType<typeof useIntakeStore.getState>;

/**
 * Lo ÚNICO que la cara de Alba lee del store: cinco primitivos. Con
 * `useShallow`, mientras ninguno cambie el avatar no se re-renderiza, aunque
 * `SetupView` sí lo haga por cada mensaje o cada dato guardado en la ficha.
 */
interface AlbaSnapshot {
  thinking: boolean;
  blocked: string | null;
  lastRole: "assistant" | "client" | null;
  lastFailed: boolean;
  lastQuestion: boolean;
}

const selectAlbaSnapshot = (state: IntakeStoreState): AlbaSnapshot => {
  const last = state.messages.at(-1);
  return {
    thinking: state.thinking,
    blocked: state.blocked?.code ?? null,
    lastRole: last?.role ?? null,
    lastFailed: last?.failed === true,
    lastQuestion: (last?.question ?? null) !== null,
  };
};

/**
 * El humor de Alba: la costura entre el store del intake y el reloj de humor
 * del kit. Alba no tiene streaming ni propuestas que celebrar; su cara vive de
 * pensar, escuchar, preguntar y disculparse cuando un turno falla.
 */
export function useAlbaMood({ clientTyping }: { clientTyping: boolean }): Omit<AssistantMoodState, "playGesture"> {
  const snap = useIntakeStore(useShallow(selectAlbaSnapshot));
  const { mood, gesture, motion, greet } = useAssistantMood({
    blocker: snap.blocked,
    thinking: snap.thinking,
    streaming: false,
    lastMessage:
      snap.lastRole === null
        ? null
        : {
            role: snap.lastRole === "client" ? "user" : "assistant",
            failed: snap.lastFailed,
            hasProposal: false,
            hasQuestion: snap.lastQuestion,
          },
    ownerTyping: clientTyping,
    celebrating: false,
  });
  return { mood, gesture, motion, greet };
}
