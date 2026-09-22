"use client";

import { TemplateTextField } from "@/shared/components/features/template-text-field/TemplateTextField";
import type { TemplateVariableView } from "@/modules/documents/domain/template";

/**
 * Un texto con variables dentro de un bloque: compone el `TemplateTextField`
 * compartido con las variables que ESTE tipo de documento tiene, que vienen
 * del servidor. Las etiquetas también: el cliente no las inventa.
 */
export function BlockTextField({
  value,
  onChange,
  variables,
  maxLength,
  label,
  rows = 4,
  placeholder,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  variables: readonly TemplateVariableView[];
  maxLength: number;
  label: string;
  rows?: number;
  placeholder?: string;
  error?: string;
}) {
  const names = variables.map((variable) => variable.name);
  const labels = Object.fromEntries(
    variables.map((variable) => [variable.name, variable.label]),
  ) as Record<string, string>;
  return (
    <TemplateTextField
      value={value}
      onChange={onChange}
      variables={names}
      labels={labels}
      maxLength={maxLength}
      label={label}
      rows={rows}
      {...(placeholder === undefined ? {} : { placeholder })}
      {...(error === undefined ? {} : { error })}
    />
  );
}
