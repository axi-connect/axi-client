"use client";

import { cn } from "@/core/lib/utils";
import { PRICING_VOLUMES, type VolumeId } from "@/modules/landing/ui/content/landing.content";

/**
 * Eje de volumen: el visitante declara cuántas conversaciones maneja y las tres
 * tarjetas se recalculan a la vez.
 *
 * Chips y no un desplegable en un rail lateral. El rail se comía una columna
 * entera y dejaba las tarjetas por debajo de un ancho legible, que es el
 * problema que esta sección lleva dos versiones intentando resolver: aquí la
 * elección ocupa una línea y **todo el ancho queda para lo que se compara**.
 *
 * Radios nativos (ocultos) con labels-pastilla, no botones: el agrupado, la
 * navegación por flechas y el anuncio del estado seleccionado los da el
 * navegador. Solo hay que estilar y garantizar el foco visible.
 */
export function VolumeChips({
  value,
  onChange,
}: {
  value: VolumeId;
  onChange: (next: VolumeId) => void;
}) {
  return (
    <fieldset className="text-center">
      <legend className="text-muted-foreground mx-auto mb-4 text-sm">
        ¿Cuántas conversaciones con IA manejas al mes?
      </legend>
      <div className="flex flex-wrap justify-center gap-2">
        {PRICING_VOLUMES.map((volume) => {
          const selected = volume.id === value;
          return (
            <label
              key={volume.id}
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
                name="pricing-volume"
                value={volume.id}
                checked={selected}
                onChange={() => onChange(volume.id)}
                className="sr-only"
              />
              {/* Tabular para que la fila no baile al cambiar de selección. */}
              <span className={volume.conversations === null ? undefined : "font-mono tabular-nums"}>
                {volume.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
