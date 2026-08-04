"use client";

import { cn } from "@/core/lib/utils";
import { VOLUME_ESTIMATOR, type VolumeChoiceId } from "@/modules/landing/ui/content/landing.content";

/**
 * Estimador de volumen: el visitante declara cuántas conversaciones maneja y
 * la sección le fija el tramo de precio y le señala el plan que le toca.
 *
 * Radios nativos (ocultos) con labels-pill, no botones: el agrupado, la
 * navegación por flechas y el anuncio del estado seleccionado los da el
 * navegador. Solo hay que estilar y garantizar el foco visible.
 */
export function VolumeEstimator({
  value,
  onChange,
}: {
  value: VolumeChoiceId;
  onChange: (next: VolumeChoiceId) => void;
}) {
  return (
    <fieldset className="text-center">
      <legend className="text-muted-foreground mx-auto mb-4 text-sm">
        {VOLUME_ESTIMATOR.legend}
      </legend>
      <div className="flex flex-wrap justify-center gap-2">
        {VOLUME_ESTIMATOR.choices.map((choice) => {
          const selected = choice.id === value;
          return (
            <label
              key={choice.id}
              className={cn(
                "flex h-10 cursor-pointer items-center rounded-full border px-4 text-sm transition-colors",
                "focus-within:ring-ring focus-within:ring-[3px] focus-within:outline-none",
                selected
                  ? "border-brand bg-accent text-foreground font-medium"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-input",
              )}
            >
              <input
                type="radio"
                name="volume-estimator"
                value={choice.id}
                checked={selected}
                onChange={() => onChange(choice.id)}
                className="sr-only"
              />
              {choice.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
