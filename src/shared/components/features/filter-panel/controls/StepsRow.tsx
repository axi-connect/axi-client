"use client";

import { cn } from "@/core/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { NO_FILTER_VALUE } from "../filter-schema";

/**
 * Umbrales etiquetados: «60 o más · bueno», no un deslizador.
 *
 * La decisión ya estaba tomada y escrita en el repo (`SCORE_STEPS`): *nadie
 * distingue un 43 de un 47, y un deslizador promete esa precisión*. La etiqueta
 * dice qué SIGNIFICA el número, que es lo que de verdad se elige. Beneficio
 * colateral: no entra `@radix-ui/react-slider`, que no está instalado.
 *
 * Un rango cerrado se expresa con DOS `steps` (mínimo y máximo), no con un
 * control de dos manijas.
 *
 * El valor viaja tal como lo declara el esquema —número si el paso es número—,
 * porque `serializeFilters` lo manda crudo al alambre. La conversión a cadena
 * existe solo para el `Select` de Radix, que no acepta `null` como valor de
 * ítem: ahí es donde entra `NO_FILTER_VALUE`.
 */
export function StepsRow({
  label,
  options,
  value,
  onChange,
  disabled,
  className,
}: {
  label: string;
  options: readonly { value: string | number | null; label: string }[];
  value: string | number | undefined;
  onChange: (next: string | number | undefined) => void;
  disabled?: boolean;
  className?: string;
}) {
  const current =
    value === undefined || value === null ? NO_FILTER_VALUE : String(value);

  return (
    <Select
      value={current}
      disabled={disabled}
      onValueChange={(next) => {
        const chosen = options.find((option) => String(option.value ?? NO_FILTER_VALUE) === next);
        onChange(chosen?.value ?? undefined);
      }}
    >
      <SelectTrigger aria-label={label} className={cn("w-full", className)}>
        <SelectValue placeholder="Cualquiera" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={String(option.value ?? NO_FILTER_VALUE)}
            value={String(option.value ?? NO_FILTER_VALUE)}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
