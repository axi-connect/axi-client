"use client";

import { cn } from "@/core/lib/utils";
import { Input } from "@/shared/components/ui/input";

/**
 * Campo de texto libre de un filtro (ciudad, dominio, referencia).
 *
 * Escribe en el borrador en cada tecla y NO debouncea: el borrador no viaja
 * hasta que se pulsa «Ver N», y el único consumidor del cambio en vivo es el
 * conteo, que lo debouncea quien lo pide (`onDraftChange`). Debounicear aquí
 * además metería un segundo estado local que se desincroniza al reabrir la hoja.
 *
 * `aria-label` y no `<Label>`: la etiqueta ya la pinta el panel encima del
 * control, y repetirla haría que el lector la anuncie dos veces.
 */
export function TextRow({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Input
      type="text"
      value={value}
      aria-label={label}
      disabled={disabled}
      placeholder={placeholder}
      classNameContainer="w-full"
      className={cn(className)}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
