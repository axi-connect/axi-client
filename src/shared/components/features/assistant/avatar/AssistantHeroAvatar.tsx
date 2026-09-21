"use client";

import { memo, useRef } from "react";

import { cn } from "@/core/lib/utils";
import { useAvatarGaze } from "../hooks/use-avatar-gaze";
import { useAvatarLife } from "../hooks/use-avatar-life";
import { AssistantAvatar } from "./AssistantAvatar";
import { AssistantStage } from "./AssistantStage";
import { gazeAllowed, isLiveMood, MOOD_EXPRESSION, type AssistantGesture, type AssistantMood } from "./avatar-mood";
import type { AssistantAvatarColor, AssistantCharacter } from "./avatar-characters";
import type { AssistantAccessory } from "./avatar-rig";

interface AssistantHeroAvatarProps {
  mood: AssistantMood;
  gesture: AssistantGesture | null;
  /** false = sin gestos, sin mirada, sin transiciones (`prefers-reduced-motion`). */
  motion: boolean;
  accessory: AssistantAccessory;
  /** Personaje y color del cuerpo; sin ellos es Lumo con su material de siempre. */
  character?: AssistantCharacter;
  color?: AssistantAvatarColor;
  /** Tamaño del escenario (`hero` = el estudio de agentes). */
  stageSize?: "default" | "hero";
  /** Toque/click/Enter sobre el personaje. */
  onGreet: () => void;
  /** Quién es, para el lector de pantalla («Axel, tu director de mercadeo»). */
  label: string;
  /** Qué hace el botón («Saludar a Axel»). */
  greetLabel: string;
  className?: string;
}

/**
 * El personaje en el hero, vivo — y **tonto**: recibe el humor por props y no
 * sabe de ningún store.
 *
 * El contrato de rendimiento es del wrapper de cada slice (`AxelHeroAvatar`,
 * `AlbaHeroAvatar`): es él quien suscribe el store con un selector superficial
 * de primitivos y quien, por tanto, decide cuántas veces se re-renderiza esto.
 * Aquí todo es `memo` con props primitivas y `AssistantAvatar` también lo es:
 * el chat puede re-renderizarse en cada delta del streaming; la cara no.
 *
 * Es un `<button>` solo cuando puede hacer algo: saludar. Bajo
 * `prefers-reduced-motion` no hay gesto posible y pasa a ser `role="img"`; un
 * botón que no hace nada visible sería un control que promete lo que no existe.
 * El label es ESTÁTICO: el humor va en `data-mood`, no en el `aria-label`
 * (el indicador de pensando ya anuncia el progreso por `aria-live` y el
 * `role="log"` la respuesta; re-anunciar el estado aquí sería ruido).
 */
export const AssistantHeroAvatar = memo(function AssistantHeroAvatar({
  mood,
  gesture,
  motion,
  accessory,
  character,
  color,
  stageSize,
  onGreet,
  label,
  greetLabel,
  className,
}: AssistantHeroAvatarProps) {
  const ref = useRef<SVGSVGElement | null>(null);
  const live = isLiveMood(mood);

  useAvatarLife(ref, { live, saccades: mood === "thinking", motion, cue: mood });
  useAvatarGaze(ref, { enabled: motion && gazeAllowed(mood) && gesture === null });

  const figure = (
    <AssistantStage busy={live} size={stageSize}>
      <AssistantAvatar
        ref={ref}
        expression={MOOD_EXPRESSION[mood]}
        character={character}
        color={color}
        accessory={accessory}
        gesture={gesture}
        transitionMs={motion ? 480 : 0}
        ease={mood === "listening" ? "snappy" : "spring"}
      />
    </AssistantStage>
  );

  if (!motion) {
    return (
      <div role="img" aria-label={label} data-mood={mood} className={cn("assistant-hero", className)}>
        {figure}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onGreet}
      // El click con ratón no le roba el foco al compositor; Tab/Enter siguen funcionando.
      onPointerDown={(event) => {
        event.preventDefault();
      }}
      aria-label={greetLabel}
      data-mood={mood}
      data-gesture={gesture ?? undefined}
      className={cn(
        "assistant-hero cursor-pointer rounded-3xl outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        className,
      )}
    >
      {figure}
    </button>
  );
});
