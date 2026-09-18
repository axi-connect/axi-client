"use client";

import { AlertTriangle } from "lucide-react";

import { TemplateTextField } from "@/shared/components/features/template-text-field/TemplateTextField";
import {
  MAX_MESSAGE_TEMPLATE_LENGTH,
  previewTemplate,
  TEMPLATE_VARIABLE_LABELS,
  unfilledTemplateVariables,
  type TemplateVariable,
} from "@/modules/marketing/domain/template";

/**
 * Editor del mensaje con vista previa fiel.
 *
 * La previsualización usa el MISMO renderizador que el backend, así que enseña
 * también cómo se cierran los huecos cuando una variable no tiene dato — que es
 * justo lo que sorprende al usuario si no lo ve antes de enviar.
 *
 * El editor en sí es `TemplateTextField`, compartido con las plantillas de
 * recordatorio de cobro (F5): lo que se comparte es el problema de escribir
 * `{{variable}}` sin erratas, no el aspecto de la vista previa, que aquí es una
 * burbuja de campaña y allí el hilo de una cobranza.
 */
export function MessageTemplateField({
  value,
  onChange,
  available,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Variables que ESTE contexto rellena de verdad. */
  available: readonly TemplateVariable[];
  error?: string;
}) {
  const unfilled = unfilledTemplateVariables(value, available);
  const preview = previewTemplate(value, available);

  return (
    <TemplateTextField
      value={value}
      onChange={onChange}
      variables={available}
      labels={TEMPLATE_VARIABLE_LABELS}
      maxLength={MAX_MESSAGE_TEMPLATE_LENGTH}
      label="Mensaje de la regla"
      placeholder="Hola {{first_name}}, dejaste {{product}} en el carrito 👀"
      {...(error === undefined ? {} : { error })}
      preview={
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            Vista previa
          </span>
          <div className="rounded-md border border-border/60 bg-foreground/[0.03] p-3.5">
            {preview ? (
              <div className="max-w-[32ch] rounded-2xl rounded-bl-sm border border-border/60 bg-background px-3 py-2 text-sm leading-relaxed shadow-sm">
                {preview}
                <span className="mt-1 block text-right text-[0.625rem] text-muted-foreground">
                  12:04 ✓✓
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Escribe el mensaje y aquí verás cómo le llega al cliente.
              </p>
            )}
          </div>

          {unfilled.length > 0 && (
            <p className="flex gap-2 rounded-md border border-warning/30 bg-warning/5 px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-warning"
              />
              <span>
                En este contexto no se rellenan{" "}
                <span className="font-mono">
                  {unfilled.map((v) => `{{${v}}}`).join(", ")}
                </span>
                : el mensaje saldrá sin ellas.
              </span>
            </p>
          )}
        </div>
      }
    />
  );
}
