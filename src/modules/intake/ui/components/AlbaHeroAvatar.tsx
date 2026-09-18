"use client";

import { memo } from "react";

import { useAlbaMood } from "@/modules/intake/infrastructure/hooks/use-alba-mood";
import { AssistantHeroAvatar } from "@/shared/components/features/assistant/avatar/AssistantHeroAvatar";
import type { AssistantAccessory } from "@/shared/components/features/assistant/avatar/avatar-rig";

/**
 * Alba lleva la diadema SIEMPRE: es lo que la distingue de Axel a primera
 * vista, con la misma cara (decisión del dueño, 2026-09-17). No es una
 * preferencia: es el personaje.
 */
export const ALBA_ACCESSORY: AssistantAccessory = "headset";

export const albaLabel = (name: string): string => `${name}, te ayuda a poner a punto tu cuenta`;
export const albaGreetLabel = (name: string): string => `Saludar a ${name}`;

interface AlbaHeroAvatarProps {
  /** El nombre viene del guion del servidor (`session.assistant_name`). */
  name: string;
  /** Foco en el compositor o borrador sin enviar: Alba escucha. */
  clientTyping: boolean;
  className?: string;
}

/**
 * Alba en el hero, viva: la costura entre el store del intake y el personaje
 * compartido del kit. Suscripción propia y superficial (`useAlbaMood`): la vista
 * se re-renderiza por cada mensaje y cada dato de la ficha; la cara, solo cuando
 * cambia el humor.
 */
export const AlbaHeroAvatar = memo(function AlbaHeroAvatar({ name, clientTyping, className }: AlbaHeroAvatarProps) {
  const { mood, gesture, motion, greet } = useAlbaMood({ clientTyping });
  return (
    <AssistantHeroAvatar
      mood={mood}
      gesture={gesture}
      motion={motion}
      accessory={ALBA_ACCESSORY}
      onGreet={greet}
      label={albaLabel(name)}
      greetLabel={albaGreetLabel(name)}
      className={className}
    />
  );
});
