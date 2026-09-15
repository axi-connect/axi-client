"use client";

import { memo, useRef } from "react";

import { cn } from "@/core/lib/utils";
import { gazeAllowed, isLiveMood, MOOD_EXPRESSION } from "@/modules/cmo/domain/axel-mood";
import { useAxelAccessory } from "@/modules/cmo/infrastructure/hooks/use-axel-appearance";
import { useAxelGaze } from "@/modules/cmo/infrastructure/hooks/use-axel-gaze";
import { useAxelLife } from "@/modules/cmo/infrastructure/hooks/use-axel-life";
import { useAxelMood } from "@/modules/cmo/infrastructure/hooks/use-axel-mood";
import { AxelAvatar } from "./AxelAvatar";
import { AxelStage } from "./AxelStage";

export const AXEL_LABEL = "Axel, tu director de mercadeo";
export const AXEL_GREET_LABEL = "Saludar a Axel";

interface AxelHeroAvatarProps {
  /** Foco en el compositor o borrador sin enviar: Axel escucha. */
  ownerTyping: boolean;
  className?: string;
}

/**
 * Axel en el hero, vivo.
 *
 * Tiene **suscripción propia al store** y no recibe el humor por props a
 * propósito: `AxelChat` suscribe `thread` y `live` enteros y se re-renderiza en
 * cada delta del streaming. Si el avatar dependiera de sus props, sesenta nodos
 * SVG se reconciliarían decenas de veces por respuesta. Con `useAxelMood`
 * (selector superficial de nueve primitivos) y `AxelAvatar` en `memo`, el hero
 * se vuelve a pintar cuando cambia el humor, y nunca por un delta.
 *
 * Es un `<button>` solo cuando puede hacer algo: saludar. Bajo
 * `prefers-reduced-motion` no hay gesto posible y pasa a ser `role="img"`; un
 * botón que no hace nada visible sería un control que promete lo que no existe.
 * El label es ESTÁTICO: el humor va en `data-mood`, no en el `aria-label`
 * (`AxelThinking` ya anuncia el progreso por `aria-live` y el `role="log"` la
 * respuesta; re-anunciar el estado aquí sería ruido).
 */
export const AxelHeroAvatar = memo(function AxelHeroAvatar({ ownerTyping, className }: AxelHeroAvatarProps) {
  const { mood, gesture, motion, greet } = useAxelMood({ ownerTyping });
  const [accessory] = useAxelAccessory();
  const ref = useRef<SVGSVGElement | null>(null);
  const live = isLiveMood(mood);

  useAxelLife(ref, { mood, live, motion });
  useAxelGaze(ref, { enabled: motion && gazeAllowed(mood) && gesture === null });

  const figure = (
    <AxelStage busy={live}>
      <AxelAvatar
        ref={ref}
        expression={MOOD_EXPRESSION[mood]}
        accessory={accessory}
        gesture={gesture}
        transitionMs={motion ? 480 : 0}
        ease={mood === "listening" ? "snappy" : "spring"}
      />
    </AxelStage>
  );

  if (!motion) {
    return (
      <div role="img" aria-label={AXEL_LABEL} data-mood={mood} className={cn("axel-hero", className)}>
        {figure}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={greet}
      // El click con ratón no le roba el foco al compositor; Tab/Enter siguen funcionando.
      onPointerDown={(event) => {
        event.preventDefault();
      }}
      aria-label={AXEL_GREET_LABEL}
      data-mood={mood}
      data-gesture={gesture ?? undefined}
      className={cn(
        "axel-hero cursor-pointer rounded-3xl outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        className,
      )}
    >
      {figure}
    </button>
  );
});
