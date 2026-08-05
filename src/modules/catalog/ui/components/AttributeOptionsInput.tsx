"use client";

import { OptionsInput } from "@/shared/components/features/options-input";

/**
 * Opciones de un atributo `select` del attribute set.
 *
 * Delega en `OptionsInput` de `shared/` (el mismo control lo usa el editor de
 * formularios de captura). Conserva los límites del catálogo: 120 caracteres
 * por opción y sin tope de items — el backend de catalog no impone uno.
 */
export function AttributeOptionsInput({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (options: string[]) => void;
  disabled?: boolean;
}) {
  return <OptionsInput value={value} onChange={onChange} disabled={disabled} maxLength={120} />;
}
