"use client";

import { memo } from "react";

import { useAxelAccessory } from "@/modules/cmo/infrastructure/hooks/use-axel-appearance";
import { useAxelMood } from "@/modules/cmo/infrastructure/hooks/use-axel-mood";
import { AssistantHeroAvatar } from "@/shared/components/features/assistant";

export const AXEL_LABEL = "Axel, tu director de mercadeo";
export const AXEL_GREET_LABEL = "Saludar a Axel";

interface AxelHeroAvatarProps {
  /** Foco en el compositor o borrador sin enviar: Axel escucha. */
  ownerTyping: boolean;
  className?: string;
}

/**
 * Axel en el hero, vivo: la costura entre el store del CMO y el personaje
 * compartido del kit.
 *
 * Tiene **suscripción propia al store** y no recibe el humor por props a
 * propósito: `AxelChat` suscribe `thread` y `live` enteros y se re-renderiza en
 * cada delta del streaming. Si el avatar dependiera de sus props, sesenta nodos
 * SVG se reconciliarían decenas de veces por respuesta. Con `useAxelMood`
 * (selector superficial de nueve primitivos) y el hero del kit en `memo`, la
 * cara se vuelve a pintar cuando cambia el humor, y nunca por un delta.
 */
export const AxelHeroAvatar = memo(function AxelHeroAvatar({ ownerTyping, className }: AxelHeroAvatarProps) {
  const { mood, gesture, motion, greet } = useAxelMood({ ownerTyping });
  const [accessory] = useAxelAccessory();
  return (
    <AssistantHeroAvatar
      mood={mood}
      gesture={gesture}
      motion={motion}
      accessory={accessory}
      onGreet={greet}
      label={AXEL_LABEL}
      greetLabel={AXEL_GREET_LABEL}
      className={className}
    />
  );
});
