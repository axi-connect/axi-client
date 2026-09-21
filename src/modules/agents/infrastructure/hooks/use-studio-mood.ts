"use client";

import { useEffect, useRef } from "react";

import { useAssistantMood, type AssistantMoodState } from "@/shared/components/features/assistant";

export interface StudioMoodInput {
  /** El agente está pausado: duerme. */
  paused: boolean;
  /** Guardando: piensa (y respira). */
  saving: boolean;
  /** El último guardado falló: lo siente. */
  saveError: boolean;
  /** El dueño está escribiendo el nombre: escucha. */
  nameFocused: boolean;
  /** Se acaba de guardar (la vista lo mantiene `PROUD_MS`): orgulloso. */
  justSaved: boolean;
  /** Suena la muestra de la voz elegida: habla. */
  previewPlaying: boolean;
  /** Cambia con el personaje o el color: asiente una vez. */
  appearanceKey: string;
}

/**
 * El humor del personaje del estudio, en función de lo que pasa en la pantalla
 * — y de nada más: en reposo no hay temporizadores (regla del kit). Traduce
 * los estados del formulario al `AssistantMoodInput` del kit, que ya resuelve
 * las prioridades (dormido > lo siente > pensando/hablando > escuchando >
 * orgulloso), y asiente cuando el dueño cambia de cara o de color.
 */
export function useStudioMood(input: StudioMoodInput): AssistantMoodState {
  const state = useAssistantMood({
    blocker: input.paused ? "paused" : null,
    thinking: input.saving || input.previewPlaying,
    streaming: input.previewPlaying,
    lastMessage: input.saveError ? { role: "user", failed: true, hasProposal: false, hasQuestion: false } : null,
    ownerTyping: input.nameFocused,
    celebrating: input.justSaved,
  });

  // Asentir al cambiar de personaje/color: una vez por cambio, nunca al montar.
  const lastKey = useRef(input.appearanceKey);
  const { playGesture } = state;
  useEffect(() => {
    if (lastKey.current === input.appearanceKey) return;
    lastKey.current = input.appearanceKey;
    playGesture("nod");
  }, [input.appearanceKey, playGesture]);

  return state;
}
