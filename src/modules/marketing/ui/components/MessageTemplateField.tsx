"use client";

import { useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/core/lib/utils";
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
 * Los chips insertan la variable en la posición del cursor: escribir
 * `{{coupon_code}}` a mano es una fuente de erratas que el backend castiga con
 * un 422.
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function insert(variable: TemplateVariable) {
    const token = `{{${variable}}}`;
    const el = textareaRef.current;
    if (!el) {
      onChange(`${value}${token}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
    onChange(next);
    // Devuelve el cursor justo después de lo insertado: encadenar variables no
    // debería obligar a recolocarlo a mano.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const unfilled = unfilledTemplateVariables(value, available);
  const preview = previewTemplate(value, available);
  const remaining = MAX_MESSAGE_TEMPLATE_LENGTH - value.length;

  return (
    <div className="grid gap-3 md:grid-cols-2 md:items-start">
      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          rows={5}
          value={value}
          maxLength={MAX_MESSAGE_TEMPLATE_LENGTH}
          aria-invalid={Boolean(error)}
          aria-label="Mensaje de la regla"
          onChange={(e) => onChange(e.target.value)}
          placeholder="Hola {{first_name}}, dejaste {{product}} en el carrito 👀"
          className={cn(
            "w-full resize-y rounded-md border bg-background px-2.5 py-2 text-sm leading-relaxed focus:outline-none focus:ring-3 focus:ring-primary/20",
            error ? "border-destructive" : "border-input focus:border-primary",
          )}
        />

        <div className="flex flex-wrap gap-1.5">
          {available.map((variable) => (
            <button
              key={variable}
              type="button"
              title={TEMPLATE_VARIABLE_LABELS[variable]}
              onClick={() => insert(variable)}
              className="rounded-full border border-dashed border-input px-2 py-0.5 font-mono text-[0.6875rem] text-muted-foreground transition-colors hover:border-solid hover:border-primary hover:bg-accent hover:text-brand"
            >
              {`{{${variable}}}`}
            </button>
          ))}
        </div>

        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs tabular-nums text-muted-foreground">
            {remaining} caracteres disponibles
          </p>
        )}
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Vista previa</span>
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
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-warning" />
            <span>
              En este contexto no se rellenan{" "}
              <span className="font-mono">{unfilled.map((v) => `{{${v}}}`).join(", ")}</span>: el
              mensaje saldrá sin ellas.
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
