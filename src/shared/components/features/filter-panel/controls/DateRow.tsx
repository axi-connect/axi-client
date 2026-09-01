"use client";

import { cn } from "@/core/lib/utils";
import { Input } from "@/shared/components/ui/input";

/**
 * Fechas con el selector NATIVO del sistema (`<input type="date">`).
 *
 * No entra ningún calendario de terceros: no hay uno instalado, y el nativo ya
 * trae localización, teclado y accesibilidad resueltos por el sistema
 * operativo. Un calendario propio serían tres semanas de mantenimiento para el
 * filtro menos usado del panel.
 *
 * El valor canónico es `[desde, hasta]`, siempre arreglo, también en
 * `mode: "from"` —donde solo se usa el primer hueco—: una forma sola evita que
 * `serializeFilters` tenga que adivinar si una cadena es un «desde» o un
 * «hasta».
 */
export function DateRow({
  label,
  mode = "from",
  value,
  onChange,
  disabled,
  className,
}: {
  label: string;
  mode?: "from" | "range";
  /** `[desde, hasta]` en `YYYY-MM-DD`. */
  value: [string, string];
  onChange: (next: [string, string]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [after, before] = value;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Input
        type="date"
        value={after}
        max={before || undefined}
        disabled={disabled}
        classNameContainer="min-w-[9.5rem] flex-1"
        aria-label={mode === "range" ? `${label}: desde` : label}
        onChange={(event) => onChange([event.target.value, before])}
      />
      {mode === "range" ? (
        <Input
          type="date"
          value={before}
          min={after || undefined}
          disabled={disabled}
          classNameContainer="min-w-[9.5rem] flex-1"
          aria-label={`${label}: hasta`}
          onChange={(event) => onChange([after, event.target.value])}
        />
      ) : null}
    </div>
  );
}
